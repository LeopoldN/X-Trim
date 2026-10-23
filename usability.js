(() => {
  // Feed and post usability: Following tab, ads and sponsored posts, counts, exact numbers
  // and times, keyword / Premium filters, focus mode, new-post loading, fast block, the
  // daily limit and the profile Media tab. Static hiding is CSS behind root attributes
  // (usability.css); posts are handled one at a time as X adds or changes them.
  // Several ideas follow Control Panel for Twitter by Jonny Buchanan (MIT, see
  // THIRD_PARTY_NOTICES.txt); the code here is X Trim's own.
  const defaults={enabled:true,hidden:[],hideForYou:false,stayFollowing:false,followingRecent:false,newPosts:'default',hidePromoted:false,hideSponsored:false,hideAdHashtags:false,hideCounts:false,hideActionBar:false,exactCounts:false,timeFormat:'relative',clock24:false,focusMode:false,writerMode:false,keywordFilters:'',hideNoMedia:false,premiumReplies:false,premiumFeeds:false,filterMode:'hide',fastBlock:false,usageLimit:false,usageMinutes:60,mediaPhotos:false};
  const keys=Object.keys(defaults);
  let settings={...defaults},loaded=false;
  const root=document.documentElement;
  const on=name=>loaded&&settings.enabled!==false&&!!settings[name];

  // Facts about posts from X's own responses, keyed by post ID (see usability-background.js).
  const facts=new Map();
  const revealed=new Set();
  const byId=new Map();

  // ---- Following sorted by Recent -------------------------------------------------
  // X asks for the Following timeline with enableRanking (true = Popular). Rewrite that
  // one variable on X's own request; nothing else in the request changes.
  (function patchRequests() {
    const page=window.wrappedJSObject||window;
    const proto=page.XMLHttpRequest?.prototype;
    if(!proto)return;
    const exported=fn=>typeof exportFunction==='function'?exportFunction(fn,page):fn;
    const open=proto.open,send=proto.send,following=new WeakSet();
    const recent=()=>on('followingRecent');
    function rewrite(variables) {
      if(!variables||typeof variables!=='object'||typeof variables.enableRanking!=='boolean'||variables.enableRanking===false)return false;
      variables.enableRanking=false;return true;
    }
    proto.open=exported(function(method,url,...rest) {
      try {
        const text=String(url);
        if(recent()&&text.includes('/HomeLatestTimeline')) {
          if(String(method).toUpperCase()==='GET') {
            const parsed=new URL(text,location.href),variables=JSON.parse(parsed.searchParams.get('variables')||'null');
            if(rewrite(variables)){parsed.searchParams.set('variables',JSON.stringify(variables));url=parsed.href;}
          } else following.add(this);
        } else following.delete(this);
      } catch {}
      return open.call(this,method,url,...rest);
    });
    proto.send=exported(function(body) {
      try {
        if(recent()&&following.has(this)&&typeof body==='string') {
          const data=JSON.parse(body);
          if(rewrite(data?.variables))body=JSON.stringify(data);
        }
      } catch {}
      return send.call(this,body);
    });
  })();

  // ---- Post identity ---------------------------------------------------------------
  function identity(article) {
    const link=article.querySelector('[data-testid="User-Name"] a[href]');
    const handle=link?new URL(link.href).pathname.match(/^\/([a-z0-9_]{1,15})\/?$/i)?.[1]?.toLowerCase():null;
    const time=[...article.querySelectorAll('a[href*="/status/"]')].find(a=>a.querySelector('time')&&a.closest('article')===article);
    const id=time?new URL(time.href).pathname.match(/\/status\/(\d+)/)?.[1]:null;
    return {handle,id};
  }
  const route=()=>location.pathname.match(/^\/([a-z0-9_]{1,15})\/status\/(\d+)/i);
  const opened=id=>!!id&&route()?.[2]===id;
  const ownHandle=()=>document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')?.slice(1).toLowerCase();

  // ---- Filters ---------------------------------------------------------------------
  let patterns=[];
  function compileFilters() {
    patterns=[];
    for(const raw of String(settings.keywordFilters||'').split('\n')) {
      const line=raw.trim();if(!line)continue;
      const regex=line.match(/^\/(.+)\/([a-z]*)$/i);
      try {
        if(regex)patterns.push({label:line,test:new RegExp(regex[1],regex[2].replace(/[^imsu]/g,'')||'i')});
        else {
          const escaped=line.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          // Whole words when the entry starts and ends with a letter or digit.
          const wrap=/^\w/.test(line)&&/\w$/.test(line);
          patterns.push({label:line,test:new RegExp(wrap?`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`:escaped,'iu')});
        }
      } catch {}
    }
  }
  const hasMedia=article=>!!article.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="tweetGif"], [data-testid="previewInterstitial"]');
  const postText=article=>[...article.querySelectorAll('[data-testid="tweetText"]')].map(el=>el.textContent).join('\n').slice(0,5000);
  function adLabel(article) {
    // X's ad marker sits in the post header, beside the caret menu, as a lone "Ad" word.
    const header=article.querySelector('[data-testid="caret"]')?.parentElement?.parentElement;
    return !!header&&[...header.querySelectorAll('span')].some(span=>!span.children.length&&/^(Ad|Promoted)$/.test(span.textContent.trim()));
  }
  function sponsoredLabel(article) {
    // X's Paid partnership label links to its paid partnerships policy, between the
    // media and the action bar. The text check covers a label without that link.
    if(article.querySelector('a[href*="paid-partnerships-policy"]'))return true;
    for(const span of article.querySelectorAll('span')) {
      if(span.children.length||!/^Paid partnership$/i.test(span.textContent.trim()))continue;
      if(!span.closest('[data-testid="tweetText"]'))return true;
    }
    return false;
  }
  const adHashtag=article=>[...article.querySelectorAll('[data-testid="tweetText"] a[href*="/hashtag/"]')].some(a=>/^\/hashtag\/(ad|ads|sponsored|spon)$/i.test(new URL(a.href).pathname));
  function verifiedReason(article,id,handle) {
    const fact=facts.get(id);
    if(!fact?.blue||fact.verifiedType||fact.following)return null;
    const match=route();
    if(handle&&(handle===ownHandle()))return null;
    if(match) {
      // Only replies below the opened post; the thread above it stays for context.
      const focused=byId.get(match[2]);
      if(!settings.premiumReplies||opened(id)||handle===match[1].toLowerCase()||!focused?.isConnected||!(focused.compareDocumentPosition(article)&Node.DOCUMENT_POSITION_FOLLOWING))return null;
      return 'Premium reply';
    }
    // Never on that account's own profile.
    if(handle&&location.pathname.split('/')[1]?.toLowerCase()===handle)return null;
    return settings.premiumFeeds?'Premium account':null;
  }
  function reasons(article,id,handle) {
    // Ads and sponsored posts are always removed outright, never collapsed.
    // X's placementTracking wrapper is not an ad marker: it also wraps every video player.
    if(on('hidePromoted')&&(facts.get(id)?.promoted||adLabel(article)))return {remove:true};
    if(on('hideSponsored')&&(facts.get(id)?.sponsored||sponsoredLabel(article)))return {remove:true};
    if(on('hideAdHashtags')&&adHashtag(article))return {remove:true};
    if(settings.enabled===false||opened(id)||(id&&revealed.has(id)))return null;
    if(patterns.length) {
      const text=postText(article);
      const hit=patterns.find(pattern=>pattern.test.test(text));
      if(hit)return {label:'Filtered: '+hit.label};
    }
    if(on('hideNoMedia')&&location.pathname==='/home'&&!hasMedia(article))return {label:'Post without media'};
    if(settings.enabled!==false&&(settings.premiumReplies||settings.premiumFeeds)) {
      const label=verifiedReason(article,id,handle);
      if(label)return {label:label+(handle?' · @'+handle:'')};
    }
    return null;
  }
  function clearFilter(article) {
    if(article.hasAttribute('data-xtrim-u'))article.removeAttribute('data-xtrim-u');
    article.querySelector(':scope > .xtrim-u-notice')?.remove();
  }
  function applyFilter(article,id,handle) {
    const result=reasons(article,id,handle);
    if(!result){clearFilter(article);return;}
    const mode=result.remove?'remove':({highlight:'highlight',remove:'remove'}[settings.filterMode]||'hide');
    if(article.getAttribute('data-xtrim-u')!==mode)article.setAttribute('data-xtrim-u',mode);
    let notice=article.querySelector(':scope > .xtrim-u-notice');
    if(mode!=='hide'){notice?.remove();return;}
    if(notice?.dataset.label===result.label)return;
    if(!notice){notice=document.createElement('div');notice.className='xtrim-u-notice';article.prepend(notice);}
    notice.dataset.label=result.label;notice.replaceChildren();
    const text=document.createElement('span');text.textContent=result.label;
    const button=document.createElement('button');button.type='button';button.textContent='Show post';
    button.onclick=event=>{event.preventDefault();event.stopPropagation();if(id){revealed.add(id);while(revealed.size>500)revealed.delete(revealed.values().next().value);}clearFilter(article);};
    notice.append(text,button);
  }

  // ---- Exact counts and timestamps -------------------------------------------------
  // X's own text for each node changed here, and what was written over it. When X
  // rewrites a node itself, its new text becomes the one to restore.
  const originals=new WeakMap(),written=new WeakMap();
  const abbreviated=/^\s*\d[\d.,\s]*[KMB万億]?\s*$/i;
  function setText(node,value) {
    if(written.get(node)!==node.nodeValue)originals.set(node,node.nodeValue);
    written.set(node,value);
    if(node.nodeValue!==value)node.nodeValue=value;
  }
  function restoreText(node) {
    const original=originals.get(node);
    if(original===undefined)return;
    if(written.get(node)===node.nodeValue&&node.nodeValue!==original)node.nodeValue=original;
    originals.delete(node);written.delete(node);
  }
  const numberFormat=new Intl.NumberFormat();
  function exactCounts(article,active) {
    for(const control of article.querySelectorAll('[role="group"] :is(button, a[href$="/analytics"])')) {
      const number=(control.getAttribute('aria-label')||'').match(/^\s*(\d[\d.,\s]*)\s/)?.[1]?.replace(/\D/g,'');
      const walker=document.createTreeWalker(control,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node=walker.currentNode;
        if(!active||!number){restoreText(node);continue;}
        if(originals.has(node)||abbreviated.test(node.nodeValue))setText(node,numberFormat.format(Number(number)));
      }
    }
  }
  function timeText(date) {
    const sameYear=date.getFullYear()===new Date().getFullYear();
    const day=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',...(sameYear?{}:{year:'numeric'})}).format(date);
    const clock=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',hour12:!settings.clock24}).format(date);
    return day+', '+clock;
  }
  function timestamps(article,active) {
    for(const time of article.querySelectorAll('time[datetime]')) {
      const node=[...time.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);
      if(!node)continue;
      const date=new Date(time.getAttribute('datetime'));
      if(!active||Number.isNaN(date.getTime())){restoreText(node);continue;}
      // The opened post already shows a full date and time; only switch its clock.
      if(time.closest('article')===article&&opened(identity(article).id)) {
        if(!settings.clock24){restoreText(node);continue;}
        const clock=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',hour12:false}).format(date);
        const full=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(date);
        setText(node,clock+' · '+full);continue;
      }
      setText(node,timeText(date));
    }
  }
  function focusedViews(article,active) {
    // The opened post shows "1.2M Views" as text beside its time instead of a link.
    if(!opened(identity(article).id))return;
    for(const span of article.querySelectorAll('span')) {
      if(span.children.length||!/^Views?$/i.test(span.textContent.trim()))continue;
      const row=span.closest('div')?.parentElement;
      if(row&&/^[\d.,\s]+[KMB]?\s*Views?$/i.test(row.textContent.trim())){row.toggleAttribute('data-xtrim-views',active);row.previousElementSibling?.toggleAttribute('data-xtrim-views',active&&/^\s*·\s*$/.test(row.previousElementSibling.textContent));}
    }
  }

  // ---- Per-post pass ---------------------------------------------------------------
  function processArticle(article) {
    if(!article.isConnected)return;
    const {id,handle}=identity(article);
    if(id){const previous=article.dataset.xtrimUId;if(previous!==id){if(previous)byId.delete(previous);article.dataset.xtrimUId=id;}byId.set(id,article);}
    applyFilter(article,id,handle);
    exactCounts(article,on('exactCounts')&&!on('hideCounts'));
    timestamps(article,loaded&&settings.enabled!==false&&(settings.timeFormat==='absolute'||settings.clock24===true));
    focusedViews(article,on('hideCounts'));
  }
  const pending=new Set();
  let queued=false,full=false;
  function flush() {
    queued=false;
    if(!loaded)return;
    syncRoute();
    if(full){full=false;pending.clear();document.querySelectorAll('article[data-testid="tweet"]').forEach(processArticle);}
    else {
      for(const node of pending) {
        if(!node.isConnected)continue;
        if(node.matches('article[data-testid="tweet"]'))processArticle(node);
        else node.querySelectorAll('article[data-testid="tweet"]').forEach(processArticle);
      }
      pending.clear();
    }
    for(const [id,article] of byId)if(!article.isConnected||article.dataset.xtrimUId!==id)byId.delete(id);
    syncHomeTabs();syncNewPosts();syncMediaTab();
  }
  const schedule=()=>{if(!queued){queued=true;setTimeout(flush,50);}};

  // ---- Home tabs -------------------------------------------------------------------
  let lastPath='',switchedThisVisit=false;
  function syncHomeTabs() {
    if(location.pathname!=='/home')return;
    const list=document.querySelector('[data-testid="primaryColumn"] [role="tablist"]');
    if(!list)return;
    const tabs=[...list.querySelectorAll('[role="tab"]')];
    const forYou=tabs.find(tab=>/^for you$/i.test(tab.textContent.trim()))||tabs[0];
    const following=tabs.find(tab=>/^following$/i.test(tab.textContent.trim()))||tabs[1];
    if(!forYou||!following||forYou===following)return;
    let cell=forYou;
    while(cell.parentElement&&cell.parentElement!==list)cell=cell.parentElement;
    if(!cell.hasAttribute('data-xtrim-foryou'))cell.setAttribute('data-xtrim-foryou','');
    // Switch once per visit to Home, so choosing For you afterwards still works when it
    // is visible. With For you hidden, always return to Following.
    if((on('stayFollowing')||on('hideForYou'))&&forYou.getAttribute('aria-selected')==='true'&&(!switchedThisVisit||on('hideForYou'))) {
      switchedThisVisit=true;following.click();
    } else if(following.getAttribute('aria-selected')==='true')switchedThisVisit=true;
  }

  // ---- New posts -------------------------------------------------------------------
  const showPosts=/^show\s+[\d.,]+[km]?\s+posts?$/i;
  function newPostsBar() {
    const column=document.querySelector('[data-testid="primaryColumn"]');
    if(!column)return null;
    // A plain button in the first timeline cells, with no test ID or label.
    for(const button of column.querySelectorAll('[data-testid="cellInnerDiv"]:nth-child(-n+3) :is(button,[role="button"])'))if(showPosts.test(button.textContent.trim()))return button;
    return null;
  }
  function syncNewPosts() {
    const mode=loaded&&settings.enabled!==false?settings.newPosts:'default';
    const bar=mode==='default'?null:newPostsBar();
    if(bar){const cell=bar.closest('[data-testid="cellInnerDiv"]');if(cell&&!cell.hasAttribute('data-xtrim-new-posts'))cell.setAttribute('data-xtrim-new-posts','');}
    // Load only while reading the top of the feed, so the page never jumps mid-scroll.
    if(mode==='auto'&&bar&&window.scrollY<400&&!document.hidden)bar.click();
  }
  window.addEventListener('scroll',()=>{if(loaded&&settings.newPosts==='auto'&&window.scrollY<400)schedule();},{passive:true});

  // ---- Profile Media tab ---------------------------------------------------------
  // X opens a profile's Media tab on Videos and keeps Photos only as ?filter=photo, picked
  // from the selected tab's own menu. Pick Photos once per visit, the way a person would.
  let mediaSwitched='',mediaBusy=false;
  async function syncMediaTab() {
    if(!on('mediaPhotos')||mediaBusy)return;
    const match=location.pathname.match(/^\/([a-z0-9_]{1,15})\/media\/?$/i);
    if(!match){mediaSwitched='';return;}
    if(new URLSearchParams(location.search).has('filter')||mediaSwitched===location.pathname)return;
    const tab=document.querySelector('[data-testid="primaryColumn"] nav[aria-label="Profile timelines"] [role="tab"][aria-selected="true"][aria-haspopup="menu"]');
    if(!tab||!/^videos$/i.test(tab.textContent.trim())||document.querySelector('[role="menu"]'))return;
    mediaSwitched=location.pathname;mediaBusy=true;
    try {
      tab.click();
      const item=await new Promise(resolve=>{
        const find=()=>[...document.querySelectorAll('[role="menu"] [data-testid="Dropdown"] [role="menuitem"]')].find(el=>/^photos$/i.test(el.textContent.trim()));
        const started=Date.now();
        (function poll(){const found=find();if(found||Date.now()-started>2000)resolve(found||null);else setTimeout(poll,50);})();
      });
      if(item&&location.pathname===mediaSwitched)item.click();
      else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    } finally {mediaBusy=false;}
  }

  // ---- Route-level flags -----------------------------------------------------------
  function syncRoute() {
    if(location.pathname!==lastPath) {
      switchedThisVisit=false;
      lastPath=location.pathname;
    }
    root.toggleAttribute('data-xtrim-route-home',location.pathname==='/home');
  }
  function applyRoot() {
    const active=loaded&&settings.enabled!==false;
    const flags={'hide-foryou':active&&settings.hideForYou,'hide-ads':active&&settings.hidePromoted,'hide-counts':active&&settings.hideCounts,'hide-actions':active&&settings.hideActionBar,'focus':active&&(settings.focusMode||settings.writerMode),'writer':active&&settings.writerMode,'hide-new-posts':active&&settings.newPosts==='hide',
      // The X Money button on your own profile follows the Sidebar › Money switch.
      'hide-money':active&&Array.isArray(settings.hidden)&&settings.hidden.includes('/i/money')};
    for(const [name,value] of Object.entries(flags))root.toggleAttribute('data-xtrim-'+name,!!value);
    syncExitButton(flags.focus);
  }
  function syncExitButton(show) {
    let button=document.querySelector('.xtrim-focus-exit');
    if(!show){button?.remove();return;}
    if(button||!document.body)return;
    button=document.createElement('button');button.type='button';button.className='xtrim-focus-exit';
    button.textContent=settings.writerMode?'Exit writer mode':'Exit focus';
    button.title='Alt+Shift+F toggles focus mode';
    button.onclick=()=>browser.storage.local.set({focusMode:false,writerMode:false});
    document.body.append(button);
  }

  // ---- Fast block ------------------------------------------------------------------
  // Off by default. Only after the person picks Block in a post's menu (or X Trim's
  // Block button does), X's own confirmation is accepted for them within 3 seconds.
  let blockArmed=0;
  document.addEventListener('click',event=>{
    if(on('fastBlock')&&event.target instanceof Element&&event.target.closest('[role="menu"] [data-testid="block"]'))blockArmed=Date.now();
  },true);
  function confirmBlock(node) {
    if(!blockArmed||Date.now()-blockArmed>3000||!on('fastBlock'))return;
    const confirm=node.matches?.('[data-testid="confirmationSheetConfirm"]')?node:node.querySelector?.('[data-testid="confirmationSheetConfirm"]');
    if(!confirm)return;
    blockArmed=0;confirm.click();
  }

  // ---- Daily limit -----------------------------------------------------------------
  let usageState={over:false},usageTimer;
  function showLimit() {
    let overlay=document.querySelector('.xtrim-limit');
    if(!usageState.over||!on('usageLimit')){overlay?.remove();return;}
    if(!document.body)return;
    if(!overlay) {
      overlay=document.createElement('div');overlay.className='xtrim-limit';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','xtrim-limit-title');
      const box=document.createElement('div'),title=document.createElement('h2'),text=document.createElement('p'),more=document.createElement('button');
      title.id='xtrim-limit-title';title.textContent='That’s your X time for today';
      more.type='button';more.textContent='5 more minutes';
      more.onclick=async()=>{try{usageState=await browser.runtime.sendMessage({type:'usage-extend'});}catch{}showLimit();};
      box.append(title,text,more);overlay.append(box);document.body.append(overlay);more.focus();
    }
    overlay.querySelector('p').textContent=`You’ve used X for ${usageState.used} minutes today. Your limit is ${usageState.limit} minutes. Change it in X Trim › Feed.`;
  }
  async function usageTick() {
    if(!on('usageLimit'))return;
    const visible=document.visibilityState==='visible'&&document.hasFocus();
    try{usageState=await browser.runtime.sendMessage({type:'usage-tick',count:visible&&!usageState.over})||{over:false};}catch{return;}
    showLimit();
  }
  function syncUsage() {
    clearInterval(usageTimer);
    if(!on('usageLimit')){usageState={over:false};showLimit();return;}
    usageTimer=setInterval(usageTick,15000);usageTick();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)usageTick();});

  // ---- Wiring ----------------------------------------------------------------------
  new MutationObserver(records=>{
    for(const record of records) {
      const target=record.type==='characterData'?record.target.parentElement:record.target;
      if(!target)continue;
      const article=target.closest('article[data-testid="tweet"]');
      if(article)pending.add(article);
      if(record.type==='childList')for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE){if(!article)pending.add(node);confirmBlock(node);}
    }
    schedule();
  }).observe(root,{childList:true,subtree:true,characterData:true});
  browser.runtime.onMessage.addListener(message=>{
    if(message.type!=='timeline-data'||!message.tweets)return;
    for(const [id,fact] of Object.entries(message.tweets)){if(!/^\d+$/.test(id))continue;const merged={...facts.get(id),...fact};facts.delete(id);facts.set(id,merged);const article=byId.get(id);if(article)pending.add(article);}
    while(facts.size>5000)facts.delete(facts.keys().next().value);
    schedule();
  });
  function applyAll(){compileFilters();applyRoot();syncUsage();full=true;schedule();}
  browser.storage.local.get(defaults).then(value=>{settings=value;loaded=true;applyAll();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!keys.some(key=>key in changes))return;
    for(const key of keys)if(changes[key])settings[key]=changes[key].newValue??defaults[key];
    if(changes.focusMode||changes.writerMode)document.querySelector('.xtrim-focus-exit')?.remove();
    if(changes.mediaPhotos)mediaSwitched='';
    applyAll();
  });
  window.addEventListener('popstate',schedule);
  document.addEventListener('DOMContentLoaded',()=>{applyRoot();showLimit();});
})();
