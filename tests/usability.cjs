// Run with Node.js and Playwright's Chromium. x.com is served from local fixtures.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const post=(id,handle,body,extra='')=>`<div data-testid="cellInnerDiv"><div><article data-testid="tweet" id="p${id}"><div data-testid="User-Name"><a href="/${handle}">${handle}</a><a href="/${handle}/status/${id}"><time datetime="2026-10-21T14:05:00.000Z">2h</time></a></div><div><div><button data-testid="caret">More</button></div></div><div data-testid="tweetText">${body}</div>${extra}<div role="group" aria-label="1234 replies, 5678 likes, 98765 views"><button data-testid="reply" aria-label="1234 Replies. Reply"><span><span>1.2K</span></span></button><button data-testid="like" aria-label="5678 Likes. Like"><span><span>5.6K</span></span></button><div><a href="/${handle}/status/${id}/analytics" aria-label="98765 views. View post analytics"><span><span>98K</span></span></a></div></div></article></div></div>`;
const home=`<html><body><a data-testid="AppTabBar_Profile_Link" href="/me">Me</a><header role="banner"><nav>Nav</nav></header><main role="main"><div><div data-testid="primaryColumn"><nav><div role="tablist"><div role="presentation"><div role="tab" aria-selected="true" id="foryou"><span>For you</span></div></div><div role="presentation"><div role="tab" aria-selected="false" id="following"><span>Following</span></div></div></div></nav><section role="region"><div>
<div data-testid="cellInnerDiv" id="bar"><div><button id="show"><span>Show 12 posts</span></button></div></div>
${post(1,'plain','hello world')}
${post(9,'video','clip','<div data-testid="placementTracking"><div data-testid="videoPlayer"></div></div>')}
${post(2,'adlabel','label ad','').replace('<button data-testid="caret">More</button>','<span>Ad</span><button data-testid="caret">More</button>')}
${post(3,'partner','sponsored text','<div><a href="https://help.x.com/rules-and-policies/paid-partnerships-policy"><span> Paid partnership</span></a></div>')}
${post(4,'hashtag','new drop <a href="/hashtag/ad?src=hashtag_click">#ad</a>')}
${post(5,'words','Huge GIVEAWAY today')}
${post(6,'regex','crypto   airdrop now')}
${post(7,'media','pic','<div data-testid="tweetPhoto"><img></div>')}
${post(8,'graph','from data')}
</div></section></div><div role="status" id="pill"><button aria-label="New posts are available. Push the period key to go to the them."><div data-testid="pillLabel">See new posts</div></button></div><div data-testid="sidebarColumn">Side</div></div></main></body></html>`;
const status=`<html><body><a data-testid="AppTabBar_Profile_Link" href="/me">Me</a><main role="main"><div data-testid="primaryColumn">${post(100,'op','opened post')}${post(101,'blue','premium reply')}${post(102,'friend','followed premium')}${post(103,'gold','business reply')}${post(104,'op','op reply')}${post(105,'other','regular reply')}</div></main></body></html>`;
const stub=prefs=>{
  window.prefs=prefs;window.sent=[];window.usage={active:true,over:false,used:3,limit:60};
  const listeners=[];
  window.browser={
    storage:{local:{get:async d=>({...d,...window.prefs}),set:async v=>{Object.assign(window.prefs,v);window.changed?.(Object.fromEntries(Object.entries(v).map(([k,newValue])=>[k,{newValue}])),'local');}},onChanged:{addListener:f=>window.changed=f}},
    runtime:{onMessage:{addListener:f=>listeners.push(f)},sendMessage:async m=>{window.sent.push(m);return m.type==='usage-extend'?{...window.usage,over:false}:window.usage;}}
  };
  window.deliver=message=>listeners.forEach(f=>f(message));
};
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(5000);
 const requests=[];
 await page.route('https://x.com/**',r=>{
   const url=r.request().url();
   if(url.includes('/i/api/')){requests.push({url,body:r.request().postData()});return r.fulfill({contentType:'application/json',body:'{}'});}
   return r.fulfill({contentType:'text/html; charset=utf-8',body:url.includes('/status/')?status:home});
 });
 await page.goto('https://x.com/home');
 await page.evaluate(stub,{enabled:true,hidePromoted:true,hideSponsored:true,hideAdHashtags:true,keywordFilters:'giveaway\n/crypto\\s+airdrop/i\n/(bad/',hideNoMedia:true,filterMode:'hide',stayFollowing:true,hideForYou:true,followingRecent:true,newPosts:'auto',exactCounts:true,timeFormat:'absolute',clock24:true});
 await page.addStyleTag({path:path.resolve('usability.css')});
 await page.addScriptTag({path:path.resolve('usability.js')});
 const shown=sel=>page.evaluate(sel=>!!document.querySelector(sel)?.checkVisibility(),sel);
 await page.waitForFunction(()=>document.querySelector('#p3')?.hasAttribute('data-xtrim-u'));
 assert.equal(await shown('#p9 [data-testid="tweetText"]'),true,'placementTracking wraps videos; not an ad');
 assert.equal(await shown('#p2'),false,'Ad label hidden');
 assert.equal(await shown('#p3'),false,'Paid partnership hidden');
 assert.equal(await shown('#p4'),false,'#ad hidden');
 assert.equal(await page.locator('#p5 .xtrim-u-notice span').textContent(),'Filtered: giveaway');
 assert.equal(await page.locator('#p6 .xtrim-u-notice span').textContent(),'Filtered: /crypto\\s+airdrop/i');
 assert.equal(await page.locator('#p1 .xtrim-u-notice span').textContent(),'Post without media','home posts without media collapse');
 assert.equal(await page.locator('#p7').getAttribute('data-xtrim-u'),null,'media posts stay');
 assert.equal(await shown('#p7 [data-testid="tweetText"]'),true);
 // Data from X's responses hides a promoted post with no visible marker.
 await page.evaluate(()=>deliver({type:'timeline-data',tweets:{8:{promoted:true}}}));
 await page.waitForFunction(()=>document.querySelector('#p8').getAttribute('data-xtrim-u')==='remove');
 await page.locator('#p5 .xtrim-u-notice button').click();
 assert.equal(await page.locator('#p5').getAttribute('data-xtrim-u'),null,'Show post reveals');
 // Home tabs, new posts and exact numbers.
 assert.equal(await page.evaluate(()=>document.querySelector('#foryou').parentElement.hasAttribute('data-xtrim-foryou')),true);
 assert.equal(await shown('#foryou'),false,'For you hidden');
 await page.evaluate(()=>{document.querySelector('#following').onclick=()=>{window.followingClicks=(window.followingClicks||0)+1;};document.querySelector('#show').onclick=()=>{window.showClicks=(window.showClicks||0)+1;};document.body.append(document.createElement('i'));});
 await page.waitForFunction(()=>window.followingClicks>=1&&window.showClicks>=1);
 assert.equal(await page.locator('#p7 [data-testid="like"] span span').textContent(),new Intl.NumberFormat().format(5678));
 assert.equal(await page.locator('#p7 a[href$="/analytics"] span span').textContent(),new Intl.NumberFormat().format(98765));
 const expected=await page.evaluate(()=>{const d=new Date('2026-10-21T14:05:00.000Z');return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(d)+', '+new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',hour12:false}).format(d);});
 assert.equal(await page.locator('#p7 time').textContent(),expected);
 // X changing a count in place is formatted again; turning the option off restores X's text.
 await page.evaluate(()=>{const b=document.querySelector('#p7 [data-testid="like"]');b.setAttribute('aria-label','5679 Likes. Like');b.querySelector('span span').firstChild.nodeValue='5.7K';});
 await page.waitForFunction(()=>document.querySelector('#p7 [data-testid="like"] span span').textContent===new Intl.NumberFormat().format(5679));
 await page.evaluate(()=>changed({exactCounts:{newValue:false},timeFormat:{newValue:'relative'},clock24:{newValue:false}},'local'));
 await page.waitForFunction(()=>document.querySelector('#p7 [data-testid="like"] span span').textContent==='5.7K'&&document.querySelector('#p7 time').textContent==='2h');
 // Following sorted by Recent: GET variables and POST bodies are rewritten.
 await page.evaluate(async()=>{
   const vars=encodeURIComponent(JSON.stringify({count:20,enableRanking:true}));
   for(const [method,url,body] of [['GET','/i/api/graphql/a/HomeLatestTimeline?variables='+vars],['POST','/i/api/graphql/a/HomeLatestTimeline',JSON.stringify({variables:{enableRanking:true}})],['GET','/i/api/graphql/a/HomeTimeline?variables='+vars]])
     await new Promise(done=>{const x=new XMLHttpRequest();x.onloadend=done;x.open(method,url);x.send(body);});
 });
 const vars=url=>JSON.parse(new URL(url).searchParams.get('variables'));
 assert.equal(vars(requests[0].url).enableRanking,false);assert.equal(vars(requests[0].url).count,20);
 assert.equal(JSON.parse(requests[1].body).variables.enableRanking,false);
 assert.equal(vars(requests[2].url).enableRanking,true,'other timelines untouched');
 // Counts, action bar, focus mode and the exit button.
 assert.equal(await shown('#pill button'),true);
 await page.evaluate(()=>changed({hideCounts:{newValue:true},focusMode:{newValue:true},newPosts:{newValue:'hide'}},'local'));
 await page.waitForFunction(()=>document.querySelector('.xtrim-focus-exit'));
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#p7 [data-testid="like"] span span')).visibility),'hidden');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#p7 a[href$="/analytics"]').parentElement).display),'none');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('header[role="banner"]')).display),'none');
 assert.equal(await shown('#pill button'),false,'new posts pill hidden');assert.equal(await shown('#show'),false,'Show posts bar hidden');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('[data-testid="sidebarColumn"]')).display),'none');
 await page.locator('.xtrim-focus-exit').click();
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-xtrim-focus')&&!document.querySelector('.xtrim-focus-exit'));
 // Fast block accepts X's confirmation only after Block was chosen.
 await page.evaluate(()=>{
   window.confirmed=0;
   const dialog=()=>{const d=document.createElement('div');d.dataset.testid='confirmationSheetDialog';const c=document.createElement('button');c.dataset.testid='confirmationSheetConfirm';c.onclick=()=>confirmed++;d.append(c);document.body.append(d);};
   window.openMenu=()=>{const menu=document.createElement('div');menu.setAttribute('role','menu');const item=document.createElement('div');item.dataset.testid='block';item.onclick=()=>{menu.remove();setTimeout(dialog,20);};menu.append(item);document.body.append(menu);return item;};
   dialog();
 });
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>confirmed),0,'off by default and never without Block');
 await page.evaluate(()=>changed({fastBlock:{newValue:true}},'local'));
 await page.evaluate(()=>{document.querySelector('[data-testid="confirmationSheetDialog"]').remove();openMenu().click();});
 await page.waitForFunction(()=>confirmed===1);
 // Daily limit overlay.
 await page.evaluate(()=>{usage.over=true;changed({usageLimit:{newValue:true}},'local');});
 await page.waitForSelector('.xtrim-limit');
 assert.match(await page.locator('.xtrim-limit p').textContent(),/3 minutes today/);
 await page.locator('.xtrim-limit button').click();
 await page.waitForFunction(()=>!document.querySelector('.xtrim-limit'));
 assert(await page.evaluate(()=>sent.some(m=>m.type==='usage-extend')));
 // Disabling X Trim restores filtered posts.
 await page.evaluate(()=>changed({enabled:{newValue:false}},'local'));
 await page.waitForFunction(()=>!document.querySelector('[data-xtrim-u]'));
 console.log('PASS ads, Paid partnership, #ad, keyword/regex and no-media filters, Following tabs and Recent sort, new posts, exact counts and times, hidden counts, focus mode, fast block, daily limit');

 // Premium replies on an opened post.
 await page.goto('https://x.com/op/status/100');
 await page.evaluate(stub,{enabled:true,premiumReplies:true,filterMode:'remove'});
 await page.addStyleTag({path:path.resolve('usability.css')});
 await page.addScriptTag({path:path.resolve('usability.js')});
 await page.evaluate(()=>deliver({type:'timeline-data',tweets:{100:{blue:true},101:{blue:true},102:{blue:true,following:true},103:{blue:true,verifiedType:'Business'},104:{blue:true},105:{}}}));
 await page.waitForFunction(()=>document.querySelector('#p101').getAttribute('data-xtrim-u')==='remove');
 for(const id of [100,102,103,104,105])assert.equal(await page.locator('#p'+id).getAttribute('data-xtrim-u'),null,'post '+id+' stays');
 console.log('PASS Premium replies skip the opened post, its author, followed accounts and business checks');
 // Own profile: X Money button follows Sidebar › Money; Media opens on Photos.
 await page.route('https://x.com/me/media**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<html><body><div data-testid="primaryColumn"><button data-testid="ownProfilePaymentsButton" aria-label="X Money">$</button><a data-testid="editProfileButton" href="/settings/profile">Edit profile</a><nav aria-label="Profile timelines"><a role="tab" href="/me">Posts</a><a role="tab" id="videos" href="/me/media" aria-selected="true" aria-haspopup="menu"><span>Videos</span></a></nav></div><script>document.getElementById("videos").onclick=e=>{e.preventDefault();const m=document.createElement("div");m.setAttribute("role","menu");m.innerHTML=\'<div data-testid="Dropdown"><div role="menuitem">Videos</div><div role="menuitem" id="photos">Photos</div></div>\';document.body.append(m);document.getElementById("photos").onclick=()=>{history.pushState(null,"","/me/media?filter=photo");m.remove();window.picked=(window.picked||0)+1;};};</script></body></html>'}));
 await page.goto('https://x.com/me/media');
 await page.evaluate(stub,{enabled:true,hidden:['/i/money'],mediaPhotos:true});
 await page.addStyleTag({path:path.resolve('usability.css')});
 await page.addScriptTag({path:path.resolve('usability.js')});
 await page.waitForFunction(()=>window.picked===1&&location.search==='?filter=photo');
 assert.equal(await shown('[data-testid="ownProfilePaymentsButton"]'),false,'X Money button hidden');
 assert.equal(await shown('[data-testid="editProfileButton"]'),true);
 await page.evaluate(()=>{document.body.append(document.createElement('i'));changed({hidden:{newValue:[]}},'local');});
 await page.waitForFunction(()=>document.querySelector('[data-testid="ownProfilePaymentsButton"]').checkVisibility());
 assert.equal(await page.evaluate(()=>window.picked),1,'Photos is picked once');
 console.log('PASS own-profile X Money button follows Sidebar › Money; Media tab opens on Photos once');
 await browser.close();

 // Background: facts from X's responses and the daily counter.
 const sent=[],store={enabled:true,hidePromoted:true,usageLimit:true,usageMinutes:1};
 const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
 const api={storage:{local:{get:async d=>({...d,...store}),set:async v=>Object.assign(store,v)},onChanged:event()},tabs:{sendMessage:async(id,m)=>sent.push(m)},runtime:{onMessage:event()},commands:{onCommand:event()}};
 let now=Date.parse('2026-10-23T12:00:00');
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context=vm.createContext({browser:api,Date:Clock,Math,Number,Object,Set,String,JSON,Promise});
 vm.runInContext(fs.readFileSync('usability-background.js','utf8'),context);
 await new Promise(setImmediate);
 const tweet=(id,user,extra={})=>({__typename:'Tweet',rest_id:id,core:{user_results:{result:user}},legacy:{full_text:'x'},...extra});
 context.rememberTimelineData({data:{entries:[
   {content:{itemContent:{promotedMetadata:{advertiser:{}},tweet_results:{result:tweet('11',{core:{screen_name:'Brand'}})}}}},
   {content:{itemContent:{tweet_results:{result:{__typename:'TweetWithVisibilityResults',tweet:tweet('12',{core:{screen_name:'Blue'},is_blue_verified:true,relationship_perspectives:{following:true}},{paid_partnership:{label:'Paid partnership'}})}}}}},
   {content:{itemContent:{tweet_results:{result:tweet('13',{legacy:{screen_name:'Gov'},is_blue_verified:true,verification:{verified_type:'Government'}})}}}}
 ]}},5);
 const facts=sent[0].tweets;
 assert.equal(facts['11'].promoted,true);assert.equal(facts['11'].handle,'brand');
 assert.equal(facts['12'].sponsored,true);assert.equal(facts['12'].blue,true);assert.equal(facts['12'].following,true);
 assert.equal(facts['13'].verifiedType,'Government');assert.equal(facts['13'].promoted,undefined);
 const tick=(count=true)=>{now+=15000;return api.runtime.onMessage.listeners[0]({type:'usage-tick',count});};
 let state;for(let i=0;i<3;i++)state=await tick();
 assert.equal(state.over,false);assert.equal(state.used,0);
 now+=600000;state=await tick(false);assert.equal(state.over,false,'time away or behind the overlay is not counted');
 state=await tick();assert.equal(state.over,true,'60 seconds of a 1-minute limit');assert.equal(state.used,1);
 state=await api.runtime.onMessage.listeners[0]({type:'usage-extend'});assert.equal(state.over,false);assert.equal(state.limit,6);
 assert.equal(store.usageToday.extra,5,'extension persists');
 await api.commands.onCommand.listeners[0]('toggle-focus-mode');assert.equal(store.focusMode,true);
 console.log('PASS background promoted / sponsored / verified facts, daily counter, snooze and focus shortcut');
})().catch(error=>{console.error(error);process.exit(1);});
