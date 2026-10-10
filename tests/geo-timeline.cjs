const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:'<html><body><main></main></body></html>'}));await page.goto('https://x.com/home');
 await page.evaluate(()=>{
  window.prefs={enabled:true,geoBlocking:true,geoCountries:'US',geoAllowed:'',geoMode:'hide'};window.calls=[];
  window.browser={storage:{local:{get:async d=>({...d,...prefs})},onChanged:{addListener:f=>window.changed=f}},runtime:{sendMessage:async m=>{calls.push(m.handle);return {ok:true,basedIn:m.handle==='unknown'?null:'United States'};}}};
  window.post=(handle,id)=>`<article data-testid="tweet"><div><div data-testid="User-Name"><a href="/${handle}">${handle}</a></div><a href="/${handle}/status/${id}"><time>Today</time></a><p>Post content</p></div></article>`;
  document.querySelector('main').innerHTML=post('example','1')+post('unknown','2');
 });
 await page.addStyleTag({path:path.resolve('geo-timeline.css')});await page.addScriptTag({path:path.resolve('geo-timeline.js')});
 await page.waitForSelector('[data-xtrim-geo="hide"]');assert.equal(await page.locator('[data-xtrim-geo]').count(),1);assert.equal(await page.getByText('Post content').first().isVisible(),false);
 await page.getByRole('button',{name:'Show post'}).click();assert.equal(await page.locator('[data-xtrim-geo]').count(),0);
 // X recycles an existing row for another post.
 await page.evaluate(()=>{document.querySelector('article').innerHTML=post('second','3').match(/<article[^>]*>(.*)<\/article>/)[1];});await page.waitForSelector('[data-xtrim-geo="hide"]');
 await page.evaluate(()=>{prefs.geoAllowed='@second';changed({geoAllowed:{}},'local');});await page.waitForFunction(()=>!document.querySelector('[data-xtrim-geo]'));
 await page.evaluate(()=>{prefs.geoAllowed='';prefs.geoMode='highlight';changed({geoMode:{}},'local');});await page.waitForSelector('[data-xtrim-geo="highlight"]');assert.equal(await page.getByText('Post content').first().isVisible(),true);
 assert.equal(await page.locator('.xtrim-geo-notice').count(),0);
 await page.evaluate(()=>document.documentElement.style.setProperty('--x-fg-brand','#ff1234'));
 assert.equal(await page.locator('[data-xtrim-geo]').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(255, 18, 52)');
 await page.evaluate(()=>{prefs.geoMode='remove';changed({geoMode:{}},'local');});
 await page.waitForFunction(()=>document.querySelector('article').dataset.xtrimGeo==='remove');
 assert.equal(await page.locator('article').first().isVisible(),false);assert.equal(await page.locator('.xtrim-geo-notice').count(),0);
 await page.evaluate(()=>{prefs.geoMode='remove';history.pushState({},'', '/second/status/3');changed({geoMode:{}},'local');});await page.waitForTimeout(200);assert.equal(await page.locator('[data-xtrim-geo]').getAttribute('data-xtrim-geo'),'highlight');
 await page.evaluate(()=>{prefs.geoBlocking=false;changed({geoBlocking:{}},'local');});await page.waitForFunction(()=>!document.querySelector('[data-xtrim-geo]'));assert.equal(await page.getByText('Post content').first().isVisible(),true);
 assert.deepEqual(await page.evaluate(()=>calls),['example','unknown','second']);await browser.close();console.log('PASS geo filtering, unknown location, show override, recycled rows, exemptions, highlighting, opened post and disable restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
