const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
// X's full Chat and Calls pages have no right column: primaryColumn grows to fill the window, the Chat page
// keeps an icon-only rail, and the Calls app caps its own column with max-w-[1280px] inside its shadow root.
const shell=`<div id="react-root" style="display:flex;flex-direction:row;width:100%">
 <header role="banner" style="display:flex;flex-shrink:0;align-items:flex-end"><div style="width:128px"><nav style="width:88px">n</nav></div></header>
 <main role="main" style="display:flex;flex-grow:1;flex-shrink:1;align-items:flex-start"><div style="display:flex;flex-grow:1;width:100%"><div style="display:flex;flex-grow:1;max-width:100%">
  <div style="display:flex;flex-direction:row;flex-grow:1;justify-content:space-between">
   <div data-testid="primaryColumn" style="display:flex;flex-direction:column;flex-grow:1"><div style="flex-grow:1"><div id="slot"></div></div></div>
  </div></div></div></main></div><div id="layers"></div>`;
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1800,height:820}});
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<html><body style="margin:0">${shell}</body></html>`}));
 await page.goto('https://x.com/i/chat');
 await page.evaluate(()=>{
  window.store={hideRightColumn:true};
  window.browser={storage:{local:{get:async d=>({...d,...store})},onChanged:{addListener:f=>window.changed=f}},runtime:{onMessage:{addListener(){}}}};
  const sheet=new CSSStyleSheet();sheet.replaceSync('.w-full{width:100%}.min-w-0{min-width:0}.max-w-\\[1280px\\]{max-width:1280px}');
  window.mount=testid=>{const slot=document.getElementById('slot');slot.replaceChildren();const host=document.createElement('div');host.setAttribute('data-testid',testid);slot.append(host);
   const root=host.attachShadow({mode:'open'});root.adoptedStyleSheets=[sheet];root.innerHTML=testid==='xcallsRemoteHost'?'<div><main class="w-full min-w-0 max-w-[1280px]">calls</main></div>':'<div class="w-full">chat</div>';};
  window.set=values=>{Object.assign(store,values);changed(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{newValue:v}])),'local');};
  mount('xchatEmbedRoute');
 });
 await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/layout.js')});
 const measure=()=>page.evaluate(()=>{const host=document.querySelector('#slot > div'),w=el=>Math.round(el.getBoundingClientRect().width);
  return{column:w(document.querySelector('[data-testid="primaryColumn"]')),header:w(document.querySelector('header[role="banner"]')),inner:w(host.shadowRoot.firstElementChild.querySelector('main')||host.shadowRoot.firstElementChild)};});
 const after=async fn=>{await page.evaluate(fn);await page.waitForTimeout(60);return measure();};
 const native=await after(()=>document.body.append(document.createElement('i')));
 assert(native.column>1500,'by default the Chat page still fills the window, even with Hide right column on');
 const chat=await after(()=>set({chatCustomWidth:true,chatWidth:900}));
 assert.deepEqual([chat.column,chat.inner],[900,900],'Chat page uses its own width');
 assert.equal(chat.header,native.header,'Chat keeps X’s own icon rail');
 // The Calls page has its own setting; the Chat width does not leak onto it.
 const callsNative=await after(()=>{history.pushState(null,'','/i/calls');mount('xcallsRemoteHost');});
 assert(callsNative.column>1500,'Calls page fills the window when only Chat has a custom width');
 assert.equal(callsNative.inner,1280,'X’s own 1280px Calls cap stays while the option is off');
 const calls=await after(()=>set({callsCustomWidth:true,callsWidth:1500}));
 assert.deepEqual([calls.column,calls.inner],[1500,1500],'a Calls width above 1280px lifts X’s cap inside the shadow root');
 const narrow=await after(()=>set({callsWidth:700}));
 assert.deepEqual([narrow.column,narrow.inner],[700,700]);
 // A popup on its own URL keeps the page width behind it.
 const popup=await after(()=>{history.pushState(null,'','/compose/post');const d=document.createElement('div');d.setAttribute('aria-modal','true');document.getElementById('layers').append(d);});
 assert.equal(popup.column,700,'a popup keeps the Calls width behind it');
 await after(()=>{document.getElementById('layers').replaceChildren();history.pushState(null,'','/i/calls');});
 // Small windows shrink the page to fit instead of overflowing.
 await page.setViewportSize({width:1000,height:820});
 const small=await after(()=>set({callsWidth:1600}));
 assert(small.column<=1000-small.header,'a width wider than the window shrinks to fit');
 await page.setViewportSize({width:1800,height:820});
 // Turning the option off restores X's layout and its cap.
 const off=await after(()=>set({callsCustomWidth:false}));
 assert(off.column>1500&&off.inner===1280,'turning Calls width off restores X’s layout');
 assert.equal(await page.evaluate(()=>document.querySelector('[data-testid="xcallsRemoteHost"]').shadowRoot.querySelector('style')),null,'the cap override is removed again');
 // Other pages ignore both settings.
 const home=await after(()=>{set({callsCustomWidth:true,hideRightColumn:false});history.pushState(null,'','/home');mount('xcallsRemoteHost');});
 assert(home.column>1500,'Chat and Calls widths do not apply on other pages');
 await browser.close();console.log('PASS Chat and Calls pages take their own custom widths, default unchanged');
})().catch(error=>{console.error(error);process.exitCode=1;});
