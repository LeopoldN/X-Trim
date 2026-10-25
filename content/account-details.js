(() => {
  let enabled = false, activeHandle = null, preferences = {enabled:true,profileAbout:false,postAbout:false};
  const results = new Map();
  const errors = { 'consent-required':'Open X Trim and re-enable account details to allow requests to X.', 'sign-in':'Sign in to X to load account details.', 'rate-limited':'X rate limit reached. Try again later.', 'request-rejected':'X rejected the request. Open About this account once, then refresh.', 'account-mismatch':'X returned a different account. Details were not displayed.', 'timeout':'X took too long to respond.', 'not-available':'X has not provided account details.', 'invalid-page':'The account lookup did not match the current page. Reload X and try again.', 'disabled':'Enable account details for this page in the extension.', 'endpoint-changed':'X’s account-details endpoint has changed.', 'http-error':'X returned an error.', 'network-error':'The account-details request could not reach X.', 'bad-response':'X sent an unexpected reply. Reload X and try again.', 'extension-error':'The extension lookup failed. Reload X and try again.', 'unavailable':'Account details could not be loaded.' };
  function currentProfile() {
    const parts = xtrimPagePath().split('/').filter(Boolean);
    if (!/^[a-z0-9_]{1,15}$/i.test(parts[0] || '') || ['home','explore','notifications','messages','i','settings','search','compose'].includes(parts[0].toLowerCase())) return null;
    // Every timeline tab under a profile (/name/reposts, /name/media, ...) is still the profile page.
    const tabs = ['with_replies','media','likes','highlights','articles','all','reposts','superfollows','affiliates'];
    const tabLinked = () => [...document.querySelectorAll('[data-testid="primaryColumn"] nav[aria-label="Profile timelines"] a[href]')]
      .some(link => new URL(link.href).pathname.replace(/\/$/, '').toLowerCase() === '/' + parts.join('/').toLowerCase());
    if (parts.length > 2 || (parts.length === 2 && !tabs.includes(parts[1].toLowerCase()) && !tabLinked())) return null;
    const name = document.querySelector('[data-testid="primaryColumn"] [data-testid="UserName"]');
    if (!name || !document.querySelector('[data-testid="primaryColumn"] nav[aria-label="Profile timelines"]')) return null;
    // Avoid applying the previous profile's response during X's client-side navigation.
    const shownHandle = [...name.querySelectorAll('span')].some(span => span.textContent.trim().toLowerCase() === '@' + parts[0].toLowerCase());
    return shownHandle ? {handle:parts[0],name} : null;
  }
  function currentPost() {
    const route = location.pathname.match(/^\/([a-z0-9_]{1,15})\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/i);
    if (!route) return null;
    const statusPath = '/' + route[1] + '/status/' + route[2];
    const tweets = [...document.querySelectorAll('[data-testid="primaryColumn"] article[data-testid="tweet"]')];
    const ownPath = path => {path = path.toLowerCase().replace(/\/$/, '');return path === statusPath.toLowerCase() || path.startsWith(statusPath.toLowerCase() + '/');};
    const linked = tweets.filter(tweet => [...tweet.querySelectorAll('a[href*="/status/"]')].some(link =>
      ownPath(new URL(link.href).pathname) && link.closest('article[data-testid="tweet"]') === tweet));
    // The opened post is the focusable article; X does not always link it to its own permalink.
    for (const tweet of linked.length ? linked : tweets.filter(tweet => tweet.getAttribute('tabindex') === '-1')) {
      const name = tweet.querySelector('[data-testid="User-Name"]');
      const author = name?.querySelector('a[href]');
      const handle = author ? new URL(author.href).pathname.split('/').filter(Boolean)[0] : null;
      if (!handle || handle.toLowerCase() !== route[1].toLowerCase()) continue;
      return {handle,name,nameLine:name.firstElementChild};
    }
    return null;
  }
  function currentTarget() {
    if (preferences.postAbout) {
      const post = currentPost();
      if (post) return post;
    }
    return preferences.profileAbout ? currentProfile() : null;
  }
  function request(handle, refresh=false) {
    const key = handle.toLowerCase();
    if (results.get(key)?.status === 'loading') return;
    results.set(key,{status:'loading'});
    render();
    const csrf = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/)?.[1] || '';
    browser.runtime.sendMessage({type:'about-lookup',handle,refresh,csrf}).then(result => {
      results.set(key,{status:result?.ok?'ready':'error',...result}); render();
    }).catch(()=>{results.set(key,{status:'error',error:'extension-error'});render();});
  }
  function render() {
    const profile = enabled ? currentTarget() : null;
    const old = document.querySelector('[data-xtrim-about]');
    if (!profile) {if (old) old.remove();closeCard(false);activeHandle=null;return;}
    activeHandle = profile.handle.toLowerCase();
    const nameLine = profile.nameLine || profile.name.querySelector('[dir="ltr"]')?.parentElement;
    if (!nameLine) return;
    let box = old;
    if (box && (box.parentElement !== nameLine || box.dataset.handle !== activeHandle)) {box.remove();box=null;closeCard(false);}
    nameLine.setAttribute('data-xtrim-about-name-row','');
    if (!box) {
      box=document.createElement('span');box.setAttribute('data-xtrim-about','');box.dataset.handle=activeHandle;box.setAttribute('role','group');box.setAttribute('aria-label','About this account');nameLine.append(box);
    }
    const state=results.get(activeHandle);
    if (!state || (state.status === 'ready' && Date.now() - state.fetchedAt >= 24 * 60 * 60 * 1000)) {request(profile.handle);return;}
    const signature=JSON.stringify(state);
    if (box.dataset.state===signature) return;
    box.dataset.state=signature;box.replaceChildren();
    if (state.status==='loading') {
      const note=document.createElement('span');note.className='xtrim-about-note';note.textContent='Loading account details…';note.setAttribute('role','status');box.append(note);return;
    }
    if (state.status==='ready') {
      box.append(makeBadge(state, profile));
    } else {
      const note=document.createElement('span');note.className='xtrim-about-note';note.textContent=(errors[state.error] || errors.unavailable) + (state.httpStatus ? ' (HTTP ' + state.httpStatus + ')' : '');note.title=note.textContent;box.append(note);
    }

  }
  let card=null, cardTrigger=null;
  const paths={globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',phone:'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm2 16h4',web:'M3 4h18v13H3zM8 21h8m-4-4v4',info:'M12 11v6m0-10v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',close:'m6 6 12 12M6 18 18 6',android:'M5 11h14v8H5zM5 8a7 7 0 0 1 14 0ZM7 3 5 1m12 2 2-2M2 11v6m20-6v6M8 19v3m8-3v3',apple:'M16 2c0 2-1 3-3 3 0-2 1-3 3-3ZM18 12c0 3 2 3 2 3-1 3-3 6-5 6l-3-1-3 1c-3 0-6-6-6-10 0-4 4-6 7-4l2 1 3-1c2-1 4 0 5 2-2 1-2 2-2 3Z'};
  function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.globe);svg.append(path);return svg;}
  function device(source){return /app store|ios|iphone|ipad|mac/i.test(source||'')?'apple':/android|google play/i.test(source||'')?'android':/web/i.test(source||'')?'web':'phone';}
  let countries;
  function flag(country){
    if(!country)return null;
    if(!countries){countries=new Map();const names=new Intl.DisplayNames(['en'],{type:'region'});for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b),name=names.of(code);if(name!==code)countries.set(name.toLowerCase(),code);}countries.set('united states of america','US');countries.set('south korea','KR');countries.set('turkey','TR');}
    const code=countries.get(country.toLowerCase());return code?String.fromCodePoint(...[...code].map(c=>c.charCodeAt(0)+127397)):null;
  }
  function closeCard(focus=true){if(!card)return;card.remove();card=null;cardTrigger?.setAttribute('aria-expanded','false');if(focus&&cardTrigger?.isConnected)cardTrigger.focus();cardTrigger=null;}
  function makeBadge(state,profile){
    const button=el('button','xtrim-account-trigger');button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label',`Account details for @${profile.handle}: ${state.basedIn||'Location not provided'}, ${state.connectedVia||'connection source not provided'}`);
    button.title=`${state.basedIn||'Location not provided'} · ${state.connectedVia||'Connection source not provided'}`;
    const country=flag(state.basedIn);button.append(country?el('span','xtrim-country-flag',country):icon('globe'),icon(device(state.connectedVia)));
    if(state.approximate)button.append(el('span','xtrim-location-warning','!'));
    button.append(el('span','xtrim-account-divider'),icon('info'));
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(cardTrigger===button){closeCard();return;}openCard(button,state,profile);});return button;
  }
  function openCard(button,state,profile){
    closeCard(false);cardTrigger=button;button.setAttribute('aria-expanded','true');
    card=el('section','xtrim-account-card');card.setAttribute('role','dialog');card.setAttribute('aria-label',`About @${profile.handle}`);card.tabIndex=-1;
    const computed=getComputedStyle(profile.name);card.style.setProperty('--account-text',computed.color);
    // Match X's native theme as well as X Trim palettes.
    let background=profile.name;while(background){const color=getComputedStyle(background).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){const rgb=color.match(/[\d.]+/g)?.map(Number);if(rgb&&rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150)card.dataset.light='true';break;}background=background.parentElement;}
    const head=el('div','xtrim-account-head'),title=el('div');title.append(el('h2','',state.name||profile.handle),el('div','xtrim-account-handle','@'+profile.handle));
    const close=el('button','xtrim-account-close');close.type='button';close.setAttribute('aria-label','Close account details');close.append(icon('close'));close.onclick=()=>closeCard();head.append(title,close);card.append(head);
    const facts=el('div','xtrim-account-facts');
    for(const [label,value,graphic] of [['Location',state.basedIn,'globe'],['Connected via',state.connectedVia,device(state.connectedVia)]]){const row=el('div','xtrim-account-fact'),key=el('span','xtrim-account-key');key.append(icon(graphic),document.createTextNode(label));const val=el('strong','',value||'Not provided');if(label==='Location'&&flag(value))val.prepend(el('span','xtrim-country-flag',flag(value)+' '));row.append(key,val);facts.append(row);}card.append(facts);
    if(state.approximate)card.append(el('p','xtrim-account-warning','X marks this location as potentially inaccurate.'));
    const details=el('dl','xtrim-account-details');const date=state.createdAt?new Date(state.createdAt):null;
    for(const [label,value] of [['Created',date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}):null],['User ID',state.userId],['Affiliation',state.affiliation]]){details.append(el('dt','',label),el('dd','',value??'Not provided'));}card.append(details);
    const footer=el('footer','xtrim-account-footer');footer.append(el('p','','From X’s About this account. Location and connection source describe the account.'));
    const refresh=el('button','xtrim-account-refresh','Refresh details');refresh.type='button';refresh.onclick=()=>{closeCard();request(profile.handle,true);};footer.append(refresh);card.append(footer);document.body.append(card);
    positionCard();card.focus();
  }
  function positionCard(){if(!card||!cardTrigger)return;const rect=cardTrigger.getBoundingClientRect(),margin=12;card.style.left=Math.max(margin,Math.min(rect.left,innerWidth-card.offsetWidth-margin))+'px';card.style.top=Math.max(margin,Math.min(rect.bottom+8,innerHeight-card.offsetHeight-margin))+'px';}
  document.addEventListener('pointerdown',event=>{if(card&&!card.contains(event.target)&&!cardTrigger?.contains(event.target))closeCard(false);});
  document.addEventListener('keydown',event=>{if(!card)return;if(event.key==='Escape'){event.preventDefault();closeCard();}else if(event.key==='Tab'){const buttons=[...card.querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===card)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  window.addEventListener('resize',positionCard);window.addEventListener('scroll',positionCard,true);
  browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false}).then(prefs=>{preferences=prefs;enabled=prefs.enabled;if(!enabled||(!prefs.profileAbout&&!prefs.postAbout)){results.clear();}render();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||(!changes.enabled&&!changes.profileAbout&&!changes.postAbout))return;
    browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false}).then(prefs=>{preferences=prefs;enabled=prefs.enabled;if(!enabled||(!prefs.profileAbout&&!prefs.postAbout)){results.clear();}render();});
  });
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;render();},100);}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',render);
  // Fallback for the background lookup: make X's About request as the page itself, same origin and X's own cookies.
  browser.runtime.onMessage.addListener(message => {
    if (message?.type !== 'about-fetch') return;
    const url = new URL(String(message.url), location.origin);
    if (url.origin !== location.origin || !/^\/i\/api\/graphql\/[A-Za-z0-9_-]+\/AboutAccountQuery$/.test(url.pathname)) return Promise.resolve(null);
    const headers = Object.fromEntries(Object.entries(message.headers || {}).filter(([name, value]) => /^(authorization|x-csrf-token|x-twitter-[a-z-]+)$/.test(name) && typeof value === 'string'));
    // Firefox runs a content script's own fetch as the extension; content.fetch runs it as the page.
    const pageFetch = typeof content === 'object' && content?.fetch && typeof cloneInto === 'function'
      ? (href, init) => content.fetch(href, cloneInto(init, window))
      : fetch;
    return pageFetch(url.href, {method:'GET', credentials:'include', headers}).then(async response => ({
      status:response.status, reset:response.headers.get('x-rate-limit-reset'), retry:response.headers.get('retry-after'), body:response.ok ? await response.text() : ''
    })).catch(() => null);
  });
})();
