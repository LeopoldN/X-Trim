const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1700,height:820}});
 const profile='<div data-testid="primaryColumn"><div><button aria-label="Back">&lt;</button><h2 role="heading">Me</h2><div>1,234 posts</div></div><div data-testid="UserAvatar-Container-me"><a href="/me/photo"><div><div></div></div></a></div><div data-testid="UserName"><span>@me</span></div><nav aria-label="Profile timelines"><a role="tab" href="/me">Posts</a><a role="tab" href="/me/media">Media</a></nav></div><div id="layers"></div>';
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<html><body>${profile}</body></html>`}));
 await page.goto('https://x.com/me');
 await page.evaluate(()=>{window.browser={storage:{local:{get:async d=>({...d,profileSquareAvatar:true,profileCustomWidth:true,profileWidth:900})},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}}};});
 await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/layout.js')});
 const state=()=>page.evaluate(()=>({page:xtrimPagePath(),profile:document.documentElement.hasAttribute('data-xtrim-profile'),square:document.documentElement.hasAttribute('data-xtrim-square-avatar'),width:document.querySelector('[data-testid="primaryColumn"]').getBoundingClientRect().width}));
 const step=async fn=>{await page.evaluate(fn);await page.waitForTimeout(60);return state();};
 const open=(route,id)=>step(`history.pushState(null,'','${route}');const d=document.createElement('div');d.id='${id}';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');document.getElementById('layers').append(d);`);
 const close=(route,id)=>step(`document.getElementById('${id}').remove();history.pushState(null,'','${route}');document.body.append(document.createElement('i'));`);
 const onProfile={page:'/me',profile:true,square:true,width:900};
 assert.deepEqual(await step(()=>document.body.append(document.createElement('i'))),onProfile);
 // Edit profile moves to /settings/profile while the profile stays rendered underneath.
 assert.deepEqual(await open('/settings/profile','edit'),onProfile,'Edit profile must keep the profile look');
 assert.deepEqual(await close('/me','edit'),onProfile);
 // Any popup on its own URL, even one X Trim has no name for, and one that slides between URLs.
 assert.deepEqual(await open('/i/brand_new_popup','new'),onProfile,'an unknown popup route must keep the profile look');
 assert.deepEqual(await step(()=>history.pushState(null,'','/i/brand_new_popup/step2')),onProfile);
 assert.deepEqual(await close('/me','new'),onProfile);
 // The URL can change a moment before X mounts the dialog.
 await step(()=>{history.pushState(null,'','/i/slow_popup');document.body.append(document.createElement('i'));});
 assert.deepEqual(await step(()=>{const d=document.createElement('div');d.id='slow';d.setAttribute('aria-modal','true');document.getElementById('layers').append(d);}),onProfile,'a late-mounting popup belongs to the page before it');
 assert.deepEqual(await close('/me','slow'),onProfile);
 // A dialog that never changed the URL (a drawer) must not pin the page across real navigation.
 await step(()=>{const d=document.createElement('div');d.id='drawer';d.setAttribute('aria-modal','true');document.getElementById('layers').append(d);});
 await page.waitForTimeout(1100);
 const away=await step(()=>{history.pushState(null,'','/home');document.body.append(document.createElement('i'));});
 assert.equal(away.page,'/home');assert(!away.profile&&!away.square,'real navigation with a drawer open must leave the profile');
 const back=await step(()=>{history.pushState(null,'','/me');document.body.append(document.createElement('i'));});
 assert.deepEqual(back,onProfile);
 // Photo viewer from a status page keeps the status page, as photo numbers change.
 await step(()=>{document.getElementById('drawer').remove();history.pushState(null,'','/me/status/1');document.body.append(document.createElement('i'));});
 assert.equal((await open('/me/status/1/photo/1','viewer')).page,'/me/status/1');
 assert.equal((await step(()=>history.pushState(null,'','/me/status/1/photo/2'))).page,'/me/status/1');
 // A first load straight onto the composer sits over Home.
 await page.goto('https://x.com/compose/post');
 await page.addScriptTag({path:path.resolve('content/page-route.js')});
 assert.equal(await page.evaluate(()=>xtrimPagePath()),'/home');
 await browser.close();console.log('PASS popups on their own URL keep the page underneath, including unknown and late-mounting ones; drawers never pin it');
})().catch(e=>{console.error(e);process.exit(1);});
