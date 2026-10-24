const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<html><head><style>.bg{background-color:rgb(0,0,0)}.tx{color:rgb(231,233,234)}.mu{color:rgb(113,118,123)}.sf{background-color:rgb(22,24,28)}</style></head><body class="bg"><div id="old" class="tx">old</div><div id="layers"><div role="dialog" aria-modal="true"><div id="slide" class="tx" style="transform:translateX(0px)">photo</div></div></div></body></html>'}));
 await page.goto('https://x.com/user/status/1/photo/1');
 await page.evaluate(()=>{window.browser={storage:{local:{get:async d=>({...d,themeMode:'custom',themeCustom:{background:'#282828',surface:'#3C3836',text:'#EBDBB2',muted:'#A89984',border:'#504945',accent:'#D79921'}})},onChanged:{addListener:f=>window.changed=f}}};
  // Count style reads to prove which passes rescan the page.
  const read=window.getComputedStyle;window.reads=0;window.getComputedStyle=function(){window.reads++;return read.apply(this,arguments);};});
 await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/theme.js')});
 await page.waitForFunction(()=>document.getElementById('old').getAttribute('data-xtrim-theme-text')==='text');
 const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 // A transform-only change, as when the photo viewer slides, triggers no pass at all.
 await page.evaluate(()=>{window.reads=0;});
 for(let x=1;x<=10;x++){await page.evaluate(x=>{document.getElementById('slide').style.transform=`translateX(${-x*80}px)`;},x);await frames();}
 assert.equal(await page.evaluate(()=>window.reads),0,'animation-only style changes must not rescan');
 // New nodes, class changes and inline color changes are still classified, without a full-page scan.
 const before=await page.evaluate(()=>document.querySelectorAll('*').length);
 await page.evaluate(()=>{window.reads=0;document.body.insertAdjacentHTML('beforeend','<div id="added" class="sf"><span id="child" class="mu">new</span></div><div id="plain">x</div>');});
 await page.waitForFunction(()=>document.getElementById('added').getAttribute('data-xtrim-theme-bg')==='surface'&&document.getElementById('child').getAttribute('data-xtrim-theme-text')==='muted');
 assert(await page.evaluate(()=>window.reads)<before,'a pass for added nodes must not read every element');
 await page.evaluate(()=>{document.getElementById('plain').className='sf';});
 await page.waitForFunction(()=>document.getElementById('plain').getAttribute('data-xtrim-theme-bg')==='surface');
 await page.evaluate(()=>{const el=document.createElement('div');el.id='inline';document.body.append(el);});await frames();
 await page.evaluate(()=>{document.getElementById('inline').setAttribute('style','color: rgb(113, 118, 123)');});
 await page.waitForFunction(()=>document.getElementById('inline').getAttribute('data-xtrim-theme-text')==='muted');
 // Switching palettes or turning the theme off and on rescans the whole page.
 await page.evaluate(()=>window.changed({themeMode:{newValue:'default'}},'local'));
 assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-xtrim-theme')),false);
 await page.evaluate(()=>{const el=document.createElement('div');el.id='while-off';el.className='tx';document.body.append(el);});await frames();
 await page.evaluate(()=>window.changed({themeMode:{newValue:'custom'}},'local'));
 assert.equal(await page.evaluate(()=>document.getElementById('while-off').getAttribute('data-xtrim-theme-text')),'text','nodes added while off are tagged when the theme returns');
 await browser.close();console.log('PASS theme skips animation-only style changes, classifies added and restyled nodes incrementally, and rescans on palette changes');
})().catch(error=>{console.error(error);process.exitCode=1;});
