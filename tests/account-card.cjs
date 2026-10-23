const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1100,height:820}});
 await page.route('https://x.com/**',route=>route.fulfill({contentType:'text/html',body:`<html><body style="background:#15202b;color:#e7e9ea;font-family:Arial;padding:40px"><div data-testid="primaryColumn"><div data-testid="UserName"><div><span dir="ltr">Example Person</span><span>@example</span></div></div><nav aria-label="Profile timelines"></nav></div></body></html>`}));
 await page.goto('https://x.com/example');
 await page.evaluate(()=>{window.browser={storage:{local:{get:async()=>({enabled:true,profileAbout:true,postAbout:true})},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(fn){window.deliver=fn;}},sendMessage:async()=>({ok:true,name:'Example Person',basedIn:'United States',connectedVia:'United States App Store',verification:'Blue',followers:241700000,following:1411,posts:109082,media:4724,createdAt:'2009-06-02T00:00:00Z',userId:'44196397',handleChanges:0,affiliation:'Example',fetchedAt:Date.now()})}};});
 await page.addStyleTag({path:path.resolve('about-profile.css')});await page.addScriptTag({path:path.resolve('page-route.js')});await page.addScriptTag({path:path.resolve('about-profile.js')});
 const badge=page.getByRole('button',{name:/Account details for/});await badge.click();
 const card=page.getByRole('dialog');await card.waitFor();assert.doesNotMatch(await card.innerText(),/verification|Followers|Following|Posts|Media|Handle changes/);assert.match(await card.innerText(),/United States App Store/);assert.match(await card.innerText(),/Created/);
 await page.screenshot({path:'/tmp/xtrim-account-card.png'});
 await page.keyboard.press('Escape');assert.equal(await card.count(),0);assert.equal(await badge.getAttribute('aria-expanded'),'false');
 await page.setViewportSize({width:360,height:640});await badge.click();const bounds=await card.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=360);assert(bounds.y>=0&&bounds.y+bounds.height<=640);
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Refresh details');
 await page.keyboard.press('Escape');await page.evaluate(()=>history.pushState({},'', '/other'));await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));assert.equal(await badge.count(),0);
 await browser.close();console.log('PASS account card content, keyboard dismissal/focus, mobile bounds, navigation cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
