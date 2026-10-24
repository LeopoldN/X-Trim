// Run with Node.js and Playwright's Chromium. x.com is served from a local fixture that
// follows the live Explore tab (October 2026): Sports and the league row are drawn by X's
// Jetfuel renderer with no test IDs, headings are bare h2 cells, spacers sit between sections.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const cell=(id,html)=>`<div data-testid="cellInnerDiv" id="${id}"><div>${html}</div></div>`;
const spacer=id=>cell(id,'<div></div>');
const heading=(id,text)=>cell(id,`<h2 role="heading" aria-level="2"><div></div><div dir="ltr"><span>${text}</span></div><div></div></h2>`);
const news=id=>cell(id,`<div data-testid="trend" role="link"><div data-testid="UserAvatar-Container-unknown"><div role="presentation"></div></div><span>Story ${id}</span></div>`);
const trend=id=>cell(id,`<div data-testid="trend" role="link"><span>Trending</span><span>Topic ${id}</span><button data-testid="caret" role="button" aria-label="More">…</button></div>`);
const user=id=>cell(id,`<button data-testid="UserCell" role="button"><div data-testid="UserAvatar-Container-${id}"><a href="/${id}"></a></div><span>@${id}</span><button data-testid="1-follow">Follow</button></button>`);
const post=id=>cell(id,`<article data-testid="tweet"><div data-testid="User-Name"><a href="/a">a</a></div><div data-testid="tweetText">post ${id}</div></article>`);
const explore=`<html><body><main role="main"><div data-testid="primaryColumn"><div role="tablist"><a role="tab" href="/explore/tabs/for_you" aria-selected="true">Explore</a><a role="tab" href="/explore/tabs/sports">Sports</a></div><section role="region"><div aria-label="Timeline: Explore"><div id="list">
${cell('sports',`<div class="jf-element jetfuel-style-root"><div><p>Sports</p></div><div><button type="button"><svg data-icon="icon-arrow-left" role="img"></svg></button></div><div><button type="button"><p>Final</p><img alt="" src="https://pbs.twimg.com/semantic_core_img/1"><p>NE</p><p>24</p></button></div></div>`)}
${spacer('s1')}
${cell('league',`<div class="jf-element jetfuel-style-root"><div><button type="button"><img alt=""><p>NFL</p><p>Powered by</p><p>Lowe's</p><span><svg data-icon="icon-chevron-right" role="img"></svg></span></button></div></div>`)}
${spacer('s2')}${spacer('s2b')}
${heading('h-news','Today’s News')}${news('n1')}${news('n2')}${spacer('s3')}
${trend('t1')}${trend('t2')}
${heading('h-follow','Who to follow')}${user('u1')}${user('u2')}${cell('more','<a role="link" href="/i/connect_people">Show more</a>')}${spacer('s4')}
${heading('h-posts','Posts For You')}${post('p1')}${post('p2')}${cell('loader','<div role="progressbar"><svg></svg></div>')}
</div></div></section></div></main><div id="layers"></div></body></html>`;
const stub=prefs=>{
  window.prefs=prefs;
  window.browser={storage:{local:{get:async d=>({...d,...window.prefs})},onChanged:{addListener:f=>window.changed=f}}};
};
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(5000);
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:explore}));
 await page.goto('https://x.com/explore');
 await page.evaluate(stub,{});
 await page.addStyleTag({path:path.resolve('content/explore.css')});
 await page.addScriptTag({path:path.resolve('content/page-route.js')});await page.addScriptTag({path:path.resolve('content/explore.js')});
 const labels=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#list > [data-testid="cellInnerDiv"]')].map(c=>[c.id,c.getAttribute('data-xtrim-explore')])));
 const visible=()=>page.evaluate(()=>[...document.querySelectorAll('#list > [data-testid="cellInnerDiv"]')].filter(c=>c.checkVisibility()).map(c=>c.id));
 const set=async values=>{await page.evaluate(values=>{Object.assign(window.prefs,values);changed(Object.fromEntries(Object.entries(values).map(([k,newValue])=>[k,{newValue}])),'local');},values);await page.waitForTimeout(80);};
 await page.waitForFunction(()=>document.querySelector('#h-posts')?.hasAttribute('data-xtrim-explore'));
 // Every cell gets its section; spacers follow the section above them; headings the one below.
 assert.deepEqual(await labels(),{sports:'sports',s1:'sports',league:'sports',s2:'sports',s2b:'sports','h-news':'news',n1:'news',n2:'news',s3:'news',t1:'trends',t2:'trends','h-follow':'follow',u1:'follow',u2:'follow',more:'follow',s4:'follow','h-posts':'posts',p1:'posts',p2:'posts',loader:'posts'});
 const all=Object.keys(await labels());
 assert.deepEqual(await visible(),all,'all options default off');
 await set({exploreSports:true});
 assert.deepEqual(await visible(),all.slice(5),'Sports hides the scores, the league row and their spacers');
 await set({exploreSports:false,exploreNews:true});
 assert.deepEqual(await visible(),all.filter(id=>!['h-news','n1','n2','s3'].includes(id)));
 await set({exploreNews:false,exploreTrends:true});
 assert.deepEqual(await visible(),all.filter(id=>!['t1','t2'].includes(id)));
 await set({exploreTrends:false,exploreFollow:true});
 assert.deepEqual(await visible(),all.filter(id=>!['h-follow','u1','u2','more','s4'].includes(id)));
 await set({exploreFollow:false,explorePosts:true});
 assert.deepEqual(await visible(),all.filter(id=>!['h-posts','p1','p2','loader'].includes(id)));
 await set({exploreSports:true,exploreNews:true,exploreTrends:true,exploreFollow:true});
 assert.deepEqual(await visible(),[],'everything off');
 // X drops cells far off screen and adds new ones as you scroll.
 await page.evaluate(()=>{for(const id of ['sports','s1','league','s2','s2b','h-news','n1','n2','s3','t1','t2','h-follow','u1','u2','more','s4','p1','p2','loader'])document.getElementById(id).remove();});
 await page.waitForTimeout(80);
 assert.equal((await labels())['h-posts'],'posts','a heading alone keeps the section it led to');
 await page.evaluate(html=>document.getElementById('list').insertAdjacentHTML('beforeend',html),post('p3')+post('p4'));
 await page.waitForFunction(()=>document.getElementById('p4').getAttribute('data-xtrim-explore')==='posts');
 assert.deepEqual(await visible(),[]);
 // A popup over Explore keeps it; the master switch and other Explore tabs show X's page.
 await page.evaluate(()=>{history.pushState(null,'','/compose/post');const d=document.createElement('div');d.id='composer';d.setAttribute('aria-modal','true');document.getElementById('layers').append(d);});
 await page.waitForTimeout(80);
 assert.deepEqual(await visible(),[],'composer over Explore keeps sections hidden');
 await page.evaluate(()=>{document.getElementById('composer').remove();history.pushState(null,'','/explore/tabs/for_you');});
 await set({enabled:false});
 assert.deepEqual(await visible(),['h-posts','p3','p4'],'master switch off shows everything');
 await set({enabled:true});
 assert.deepEqual(await visible(),[]);
 await page.evaluate(()=>{history.pushState(null,'','/explore/tabs/sports');document.getElementById('list').append(document.createElement('i'));});
 await page.waitForTimeout(80);
 assert.deepEqual(await visible(),['h-posts','p3','p4'],'other Explore tabs stay as X shows them');
 assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-xtrim-explore-posts')),false);
 await browser.close();
 console.log('explore: ok');
})().catch(error=>{console.error(error);process.exit(1);});
