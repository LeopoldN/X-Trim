const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
// X's Chat and Calls pages render inside open shadow roots (xchatEmbedRoute, xcallsRemoteHost, plus an
// unnamed body-level portal) styled by adoptedStyleSheets that redeclare the --x-* palette on [data-theme].
const app=`:root,:host,[data-theme="light"]{--x-bg-primary:#fff;--x-bg-secondary:#f7f9f9;--x-fg-primary:#0f1419;--x-btn-secondary:#eff3f4}
[data-theme="dark"]{--x-bg-primary:#000;--x-bg-secondary:#141414;--x-fg-primary:#fff;--x-btn-secondary:#202327}
.bg-primary{background-color:var(--x-bg-primary)}.text-primary{color:var(--x-fg-primary)}.remap{--x-bg-primary:var(--x-btn-secondary)}`;
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<html data-theme="dark"><body style="background:rgb(0,0,0)"><div id="react-root"><main><div data-testid="primaryColumn" style="background:rgb(0,0,0)"></div></main></div></body></html>'}));
 await page.goto('https://x.com/i/calls');
 await page.evaluate(app=>{
  const sheet=new CSSStyleSheet();sheet.replaceSync(app);
  window.mount=(parent,testid)=>{const host=document.createElement('div');if(testid)host.setAttribute('data-testid',testid);parent.append(host);const root=host.attachShadow({mode:'open'});root.adoptedStyleSheets=[sheet];root.innerHTML='<div data-theme="dark" class="bg-primary text-primary"><span class="text-primary">x</span><button class="remap bg-primary">b</button></div>';return host;};
  mount(document.querySelector('[data-testid="primaryColumn"]'),'xcallsRemoteHost');
  mount(document.body,null);
  // Another extension's body-level shadow root without X's [data-theme] wrapper is left alone.
  document.body.append(Object.assign(document.createElement('div'),{id:'foreign'}));document.getElementById('foreign').attachShadow({mode:'open'}).innerHTML='<p>other</p>';
  window.browser={storage:{local:{get:async d=>({...d,themeMode:'custom',themeCustom:{background:'#282828',surface:'#3C3836',text:'#EBDBB2',muted:'#A89984',border:'#504945',accent:'#D79921'}})},onChanged:{addListener:f=>window.changed=f}}};
 },app);
 await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/theme.js')});
 const colors=host=>page.evaluate(host=>{const root=host.shadowRoot,css=el=>getComputedStyle(el);return{bg:css(root.querySelector('[data-theme]')).backgroundColor,text:css(root.querySelector('span')).color,button:css(root.querySelector('button')).backgroundColor};},host);
 const calls=await page.$('[data-testid="xcallsRemoteHost"]'),portal=await page.evaluateHandle(()=>document.body.children[1]);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="xcallsRemoteHost"]').shadowRoot.querySelector('[data-theme]')).backgroundColor==='rgb(40, 40, 40)',undefined,{timeout:5000});
 assert.deepEqual(await colors(calls),{bg:'rgb(40, 40, 40)',text:'rgb(235, 219, 178)',button:'rgb(60, 56, 54)'},'Calls page uses the palette and keeps locally remapped tokens');
 assert.equal((await colors(portal)).bg,'rgb(40, 40, 40)','body-level X portals are themed');
 assert.equal(await page.evaluate(()=>document.getElementById('foreign').shadowRoot.querySelector('style')),null,'unrelated shadow roots are untouched');
 // Navigating to Chat mounts a new host later; it is themed without a reload.
 await page.evaluate(()=>{document.querySelector('[data-testid="xcallsRemoteHost"]').remove();history.pushState({},'','/i/chat');mount(document.querySelector('[data-testid="primaryColumn"]'),'xchatEmbedRoute');});
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="xchatEmbedRoute"]').shadowRoot.querySelector('[data-theme]')).backgroundColor==='rgb(40, 40, 40)',undefined,{timeout:5000});
 // Turning the theme off restores X's own palette.
 await page.evaluate(()=>window.changed({themeMode:{newValue:'default'}},'local'));
 assert.equal((await colors(await page.$('[data-testid="xchatEmbedRoute"]'))).bg,'rgb(0, 0, 0)');
 await browser.close();console.log('PASS Chat and Calls page shadow roots follow the custom theme and restore when it is off');
})().catch(error=>{console.error(error);process.exitCode=1;});
