const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1300,height:820}});
 // A profile shell with X's tab bar, including a tab X Trim has no name for yet.
 const profile='<div data-testid="primaryColumn"><div><button aria-label="Back">&lt;</button><h2 role="heading">Me</h2><div id="header-count">1,234 posts</div></div><div data-testid="UserAvatar-Container-me"><a href="/me/photo"><div><div id="ring"></div></div></a></div><div data-testid="UserName"><span>@me</span></div><div><div><a href="/me/following"><span>10</span> <span>Following</span></a></div><div><a href="/me/verified_followers"><span>20</span> <span>Followers</span></a></div></div><nav aria-label="Profile timelines"><a role="tab" href="/me">Posts</a><a role="tab" href="/me/all">All</a><a role="tab" href="/me/reposts">Reposts</a><a role="tab" href="/me/with_replies">Replies</a><a role="tab" href="/me/media">Media</a><a role="tab" href="/me/newtab">New</a></nav></div>';
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<html><body>${profile}</body></html>`}));
 await page.goto('https://x.com/me');
 await page.evaluate(()=>{window.browser={storage:{local:{get:async d=>({...d,profileFont:'mono',profileSquareAvatar:true,profileCustomWidth:true,profilePostCount:true})},onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}}};});
 await page.addScriptTag({path:path.resolve('page-route.js')});await page.addScriptTag({path:path.resolve('content.js')});
 const state=()=>page.evaluate(()=>({profile:document.documentElement.hasAttribute('data-xtrim-profile'),square:document.documentElement.hasAttribute('data-xtrim-square-avatar'),font:getComputedStyle(document.querySelector('[data-testid="UserName"] span')).fontFamily}));
 const go=async route=>{await page.evaluate(r=>{history.pushState(null,'',r);document.body.append(document.createElement('i'));},route);await page.waitForTimeout(60);return state();};
 for(const route of ['/me','/me/all','/me/reposts','/me/with_replies','/me/media','/me/likes','/me/highlights','/me/articles','/me/newtab','/me/reposts/']) {
  const s=await go(route);
  assert(s.profile&&s.square,`profile settings must apply on ${route}`);assert.match(s.font,/Menlo|Consolas|monospace/,`profile font must apply on ${route}`);
 }
 // The moved count follows the header, which X changes per tab.
 const moved=async(route,header)=>{await page.evaluate(([r,h])=>{history.pushState(null,'',r);document.getElementById('header-count').textContent=h;},[route,header]);await page.waitForTimeout(60);
  return page.evaluate(()=>({text:document.querySelector('[data-xtrim-profile-posts]')?.textContent,hidden:getComputedStyle(document.getElementById('header-count')).display==='none'}));};
 assert.deepEqual(await moved('/me','1,234 posts'),{text:'1,234 Posts',hidden:true});
 assert.deepEqual(await moved('/me/media','56 photos & videos'),{text:'56 Photos & videos',hidden:true});
 assert.deepEqual(await moved('/me/likes','7.8K likes'),{text:'7.8K Likes',hidden:true});
 assert.deepEqual(await moved('/me','1,234 posts'),{text:'1,234 Posts',hidden:true});
 // Routes that are not profile timelines keep X's own styling, even with the profile still in the DOM.
 for(const route of ['/me/status/123','/me/followers','/me/following','/me/lists','/settings','/home','/explore/tabs']) {
  const s=await go(route);
  assert(!s.profile&&!s.square,`profile settings must not apply on ${route}`);
 }
 // theme.js styles the sticky profile header on the new tabs as well.
 await page.goto('https://x.com/me/reposts');
 await page.evaluate(()=>{window.browser={storage:{local:{get:async d=>({...d,themeMode:'custom',themeCustom:{background:'#282828',surface:'#3C3836',text:'#EBDBB2',muted:'#A89984',border:'#504945',accent:'#D79921'}})},onChanged:{addListener(){}}}};});
 await page.addScriptTag({path:path.resolve('page-route.js')});await page.addScriptTag({path:path.resolve('theme.js')});
 await page.waitForFunction(()=>document.querySelector('[data-xtrim-post-header]'));
 await browser.close();console.log('PASS profile settings and the moved header count on every profile tab, not on other routes');
})().catch(e=>{console.error(e);process.exit(1);});
