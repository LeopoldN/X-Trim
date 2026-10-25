const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1300,height:820}});
 // Community Notes pages in X's light mode: the sticky bar is transparent and an inner
 // translucent white layer with a blur paints the header, which the color mapper skips.
 const shell=({back,tabs,title})=>`<html><body style="background:#fff;color:#0f1419"><main role="main"><div data-testid="primaryColumn" style="background:#fff"><div aria-label="Home timeline">`+
  `<div id="sticky" style="position:sticky;top:0"><div><div id="blur" style="background:rgba(255,255,255,.85);backdrop-filter:blur(12px)"><div id="row">`+
  (back?'<button data-testid="app-bar-back" role="button" aria-label="Back">&lt;</button>':'')+
  `<div><div><h2 role="heading" aria-level="2" style="color:rgb(15,20,25)">${title}</h2></div></div><a aria-label="Settings" href="/i/communitynotes/notification_settings">⚙</a></div>`+
  (tabs?'<nav><div role="tablist" data-testid="ScrollSnap-List"><a role="tab" aria-selected="true" href="#">Needs your help<div id="indicator" style="background:rgb(29,155,240);height:4px"></div></a><a role="tab" aria-selected="false" href="#">New</a></div></nav>':'')+
  `</div></div><div style="position:absolute"><div id="pill" style="background:rgb(29,155,240);color:#fff">See new posts</div></div></div>`+
  `<div id="body" style="background:rgb(247,249,249)"><h2 role="heading">Amazing Apple Goldfinch</h2></div></div></div></main></body></html>`;
 const pages={'/i/communitynotes':{tabs:true,title:'Community Notes'},'/i/communitynotes/u/amazing-apple-goldfinch':{back:true,title:'Your profile'},'/i/communitynotes/u/amazing-apple-goldfinch/notes':{back:true,title:'Your profile'},'/i/communitynotes/download-data':{title:'Download data'},'/i/communitynotes/about':{title:'About'}};
 await page.route('https://x.com/**',r=>{const route=new URL(r.request().url()).pathname;r.fulfill({contentType:'text/html; charset=utf-8',body:shell(pages[route]||{title:'Other'})});});
 const palette={background:'#282828',surface:'#3C3836',text:'#EBDBB2',muted:'#A89984',border:'#504945',accent:'#D79921'};
 const bg=id=>page.evaluate(id=>getComputedStyle(document.getElementById(id)).backgroundColor,id);
 for(const route of [...Object.keys(pages),'/explore']) {
  await page.goto('https://x.com'+route);
  await page.evaluate(palette=>{window.browser={storage:{local:{get:async d=>({...d,themeMode:'custom',themeCustom:palette})},onChanged:{addListener(){}}}};},palette);
  await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/theme.js')});
  await page.waitForFunction(()=>document.documentElement.hasAttribute('data-xtrim-theme'));
  if(route==='/explore') {
   // Other routes keep their own handling; this shell is not one of X Trim's known headers.
   assert.equal(await bg('blur'),'rgba(255, 255, 255, 0.85)','non Community Notes routes are unchanged');continue;
  }
  assert.equal(await bg('blur'),'rgb(40, 40, 40)',`header must use the theme on ${route}`);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('blur')).backdropFilter),'none');
  assert.equal(await bg('body'),'rgb(60, 56, 54)','the page below the header keeps its surface color');
  assert.equal(await bg('pill'),'rgb(215, 153, 33)','accent pills inside the header keep their fill');
  if(pages[route].tabs) {
   assert.equal(await page.evaluate(()=>document.querySelector('[role="tablist"]').hasAttribute('data-xtrim-feed-tabs')),true,'Community Notes tabs use the themed tab bar');
   assert.equal(await bg('indicator'),'rgb(215, 153, 33)','the selected tab keeps its indicator');
  }
 }
 await browser.close();console.log('PASS the sticky header is themed on every Community Notes page');
})().catch(e=>{console.error(e);process.exit(1);});
