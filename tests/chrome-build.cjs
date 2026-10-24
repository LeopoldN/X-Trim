// Run with Node.js and Playwright's Chromium. Builds dist/x-trim-chrome.zip, loads it
// unpacked and serves x.com from local fixtures; no network or real X account.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'x-trim-chrome-')),ext=path.join(temp,'extension');
execFileSync('python3',[path.join(root,'scripts/package.py')],{stdio:'ignore'});
execFileSync('python3',['-I','-c','import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.join(root,'dist/x-trim-chrome.zip'),ext]);
const video=id=>({data:{tweet:{id_str:id,video_info:{variants:[{url:'https://video.twimg.com/low.mp4',bitrate:10},{url:'https://video.twimg.com/high.mp4',bitrate:20}]}}}});
(async()=>{
 const context=await chromium.launchPersistentContext(path.join(temp,'profile'),{headless:true,channel:'chromium',args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:10000});
  const id=new URL(worker.url()).host,errors=[];
  await context.route('https://x.com/**',route=>{
   const url=route.request().url(),match=url.match(/graphql\/(\w+)\//);
   if(match)return route.fulfill({contentType:'application/json',body:JSON.stringify(video(match[1]==='xhr'?'111':'222'))});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main>fixture</main></body></html>'});
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://x.com/home');await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>typeof window.xtrimBrowserCompat),'undefined','compat layer must stay out of X\'s page');
  // X's own XHR and fetch replies reach the same background readers as Firefox's filter.
  await page.evaluate(async()=>{const xhr=new XMLHttpRequest();xhr.open('GET','/i/api/graphql/xhr/TweetDetail');xhr.send();await new Promise(done=>xhr.onload=done);await (await fetch('/i/api/graphql/fetch/HomeTimeline')).json();});
  await page.waitForTimeout(500);
  const variants=await worker.evaluate(()=>Object.fromEntries([...mediaVariants.values()].flatMap(cache=>[...cache])));
  assert.deepEqual(variants,{111:'https://video.twimg.com/high.mp4',222:'https://video.twimg.com/high.mp4'});
  // Forged replies from other paths are ignored.
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('xtrim-api-response',{detail:'https://x.com/i/api/2/other\n'+JSON.stringify({id_str:'333',video_info:{variants:[{url:'https://video.twimg.com/x.mp4'}]}})})));
  await page.waitForTimeout(300);
  assert.equal(await worker.evaluate(()=>[...mediaVariants.values()].some(cache=>cache.has('333'))),false);
  // Promise replies work both ways between the worker and content scripts.
  assert.deepEqual(await worker.evaluate(async()=>{const [tab]=await browser.tabs.query({url:'https://x.com/*'});return browser.tabs.sendMessage(tab.id,{type:'navigation'});}),[]);
  const popup=await context.newPage();popup.on('pageerror',error=>errors.push(error.message));
  await popup.goto(`chrome-extension://${id}/popup/popup.html`);await popup.waitForTimeout(300);
  assert.equal((await popup.evaluate(()=>browser.runtime.sendMessage({type:'usage-tick',count:false}))).over,false);
  // Data consent is recorded by X Trim and reaches the background like Firefox's onAdded.
  await popup.evaluate(()=>browser.storage.local.set({profileAbout:true}));
  assert.equal(await popup.evaluate(()=>hasDataConsent(ACCOUNT_DATA_TYPES)),false);
  await popup.waitForTimeout(200);assert.equal(await worker.evaluate(()=>captureAccountHeaders),false);
  assert.equal(await popup.evaluate(()=>browser.permissions.request({data_collection:ACCOUNT_DATA_TYPES})),true);
  await popup.waitForTimeout(300);
  assert.equal(await worker.evaluate(()=>captureAccountHeaders),true);
  assert.equal(await popup.evaluate(()=>hasDataConsent(ACCOUNT_DATA_TYPES)),true);
  assert.match(await popup.evaluate(()=>document.body.textContent),/chrome:\/\/extensions\/shortcuts/);
  assert.doesNotMatch(await popup.evaluate(()=>document.body.textContent),/Firefox/);
  assert.deepEqual(errors,[]);
  console.log('PASS Chrome build loads, reads X replies from the page hook, relays promise replies and records data consent');
 }finally{await context.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
