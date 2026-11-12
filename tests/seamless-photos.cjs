// Run with Node.js and Playwright's Chromium. x.com is served from a local fixture that
// follows the live multi-photo post (2026-11-12): a ScrollSnap-List scroll-snap row with a
// 4px gap, one role=presentation item per photo, and a rounded, bordered frame inside each.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const frame=(n,ratio,media='tweetPhoto')=>`<div role="presentation" class="item" style="display:flex;flex-direction:column;flex-shrink:0;scroll-snap-align:start"><div class="frame" style="aspect-ratio:${ratio} / 1;height:300px;box-sizing:border-box;border:1px solid rgb(47,51,54);border-radius:8px;overflow:hidden;position:relative"><a href="/a/status/1/photo/${n}" style="position:absolute;inset:0"><div data-testid="${media}" style="position:absolute;inset:0;margin:0;background:#888"></div></a></div></div>`;
const list=(items,cls='list')=>`<div style="position:relative;padding-bottom:60%"><nav role="navigation" style="position:absolute;inset:0;display:flex"><div style="display:flex;flex:1 1 0;min-width:0"><div data-testid="ScrollSnap-prevButtonWrapper"><button aria-label="Previous" disabled>‹</button></div><div data-testid="ScrollSnap-SwipeableList" style="flex:1 1 0;min-width:0"><div role="tablist" data-testid="ScrollSnap-List" class="${cls}" style="display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;padding:2px 16px">${items}</div></div><div data-testid="ScrollSnap-nextButtonWrapper"><button aria-label="Next">›</button></div></div></nav></div>`;
const body=`<html><body style="width:500px"><main>
<article data-testid="tweet" id="photos">${list(frame(1,.75)+frame(2,.57)+frame(3,1)+frame(4,.75))}</article>
<article data-testid="tweet" id="mixed">${list(frame(1,.75)+frame(2,1.77,'videoPlayer'))}</article>
<article data-testid="tweet" id="single"><div class="frame" style="border:1px solid rgb(47,51,54);border-radius:16px;overflow:hidden"><div data-testid="tweetPhoto" style="height:100px"></div></div></article>
<article data-testid="tweet" id="other">${list('<div role="presentation" class="item" style="flex-shrink:0"><div class="frame" style="width:200px;height:50px;border:1px solid;border-radius:8px">card</div></div>'.repeat(2))}</article>
</main><div id="viewer">${list(frame(1,.75)+frame(2,.75))}</div></body></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(5000);
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body}));await page.goto('https://x.com/home');
 await page.evaluate(()=>{
   window.prefs={enabled:true,seamlessPhotos:true};
   const listeners=[];
   window.browser={runtime:{onMessage:{addListener:()=>{}},sendMessage:async()=>({over:false})},storage:{local:{get:async d=>({...d,...prefs}),set:async()=>{}},onChanged:{addListener:f=>listeners.push(f)}}};
   window.changed=(changes,area)=>{for(const [k,v] of Object.entries(changes))prefs[k]=v.newValue;listeners.forEach(f=>f(changes,area));};
 });
 await page.addStyleTag({path:path.resolve('content/usability.css')});
 for(const file of ['content/page-route.js','content/usability.js'])await page.addScriptTag({path:path.resolve(file)});
 await page.waitForFunction(()=>document.documentElement.hasAttribute('data-xtrim-seamless-photos'));
 const frames=scope=>page.evaluate(s=>[...document.querySelectorAll(s+' .frame')].map(el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {left:r.left,right:r.right,radius:[c.borderTopLeftRadius,c.borderTopRightRadius,c.borderBottomRightRadius,c.borderBottomLeftRadius].join(' '),border:c.borderTopWidth};}),scope);
 const seams=list=>list.slice(1).map((f,i)=>Math.round((f.left-list[i].right)*100)/100);
 const list=scope=>page.evaluate(s=>{const el=document.querySelector(s+' [data-testid="ScrollSnap-List"]'),c=getComputedStyle(el);return {gap:c.columnGap,overflowX:c.overflowX,snap:c.scrollSnapType,scrolls:el.scrollWidth>el.clientWidth};},scope);

 // On: photos sit edge to edge, no borders, only the row's outer ends are rounded.
 let f=await frames('#photos');
 assert.deepEqual(seams(f),[0,0,0]);
 assert.deepEqual(f.map(x=>x.radius),['8px 0px 0px 8px','0px 0px 0px 0px','0px 0px 0px 0px','0px 8px 8px 0px']);
 assert.deepEqual(f.map(x=>x.border),['0px','0px','0px','0px']);
 // Scrolling stays X's own: still a scroll-snap row that overflows sideways.
 assert.deepEqual(await list('#photos'),{gap:'0px',overflowX:'auto',snap:'x mandatory',scrolls:true});
 assert.deepEqual((await page.evaluate(()=>[...document.querySelectorAll('#photos .item')].map(el=>getComputedStyle(el).scrollSnapAlign))),['start','start','start','start']);
 await page.evaluate(()=>{const el=document.querySelector('#photos [data-testid="ScrollSnap-List"]');el.scrollLeft=200;});
 assert.ok(await page.evaluate(()=>document.querySelector('#photos [data-testid="ScrollSnap-List"]').scrollLeft>0));
 // A photo + video row joins too.
 assert.deepEqual(seams(await frames('#mixed')),[0]);

 // Left alone: a single photo, a scroll row without photos, and rows outside posts.
 assert.deepEqual((await frames('#single')).map(x=>[x.radius,x.border]),[['16px 16px 16px 16px','1px']]);
 assert.deepEqual((await list('#other')).gap,'4px');
 assert.deepEqual((await frames('#other')).map(x=>x.radius),['8px 8px 8px 8px','8px 8px 8px 8px']);
 assert.deepEqual(seams(await frames('#viewer')),[4]);

 // Off: X's 4px gap, frame borders and rounded corners come back.
 await page.evaluate(()=>changed({seamlessPhotos:{newValue:false}},'local'));
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-xtrim-seamless-photos'));
 f=await frames('#photos');
 assert.deepEqual(seams(f),[4,4,4]);
 assert.deepEqual(f.map(x=>x.radius),Array(4).fill('8px 8px 8px 8px'));
 assert.deepEqual(f.map(x=>x.border),Array(4).fill('1px'));

 // X Trim switched off as a whole also restores them.
 await page.evaluate(()=>changed({seamlessPhotos:{newValue:true}},'local'));await page.waitForFunction(()=>document.documentElement.hasAttribute('data-xtrim-seamless-photos'));
 await page.evaluate(()=>changed({enabled:{newValue:false}},'local'));await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-xtrim-seamless-photos'));
 assert.deepEqual(seams(await frames('#photos')),[4,4,4]);
 await browser.close();console.log('seamless photos: ok');
})().catch(e=>{console.error(e);process.exit(1);});
