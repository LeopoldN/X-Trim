(() => {
  let enabled = false, activeHandle = null, preferences = {enabled:true,profileAbout:false,postAbout:false};
  const results = new Map();
  const errors = { 'sign-in':'Sign in to X to load account details.', 'rate-limited':'X rate limit reached. Try again later.', 'request-rejected':'X rejected the request. Open About this account once, then refresh.', 'account-mismatch':'X returned a different account. Details were not displayed.', 'timeout':'X took too long to respond.', 'not-available':'X has not provided account details.', 'invalid-page':'The account lookup did not match the current page. Reload X and try again.', 'disabled':'Enable account details for this page in the extension.', 'endpoint-changed':'X’s account-details endpoint has changed.', 'http-error':'X returned an error.', 'network-error':'The account-details request could not reach X.', 'extension-error':'The extension lookup failed. Reload X and try again.', 'unavailable':'Account details could not be loaded.' };
  function currentProfile() {
    const parts = location.pathname.split('/').filter(Boolean);
    if (!/^[a-z0-9_]{1,15}$/i.test(parts[0] || '') || ['home','explore','notifications','messages','i','settings','search','compose'].includes(parts[0].toLowerCase())) return null;
    if (parts.length > 1 && !(parts.length === 2 && ['with_replies','media','likes','highlights','articles'].includes(parts[1]))) return null;
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
    const tweets = document.querySelectorAll('[data-testid="primaryColumn"] article[data-testid="tweet"]');
    for (const tweet of tweets) {
      const permalink = [...tweet.querySelectorAll('a[href*="/status/"]')].find(link =>
        new URL(link.href).pathname.toLowerCase() === statusPath.toLowerCase() && link.closest('article[data-testid="tweet"]') === tweet);
      if (!permalink) continue;
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
    if (!profile) {if (old) old.remove();activeHandle=null;return;}
    activeHandle = profile.handle.toLowerCase();
    const nameLine = profile.nameLine || profile.name.querySelector('[dir="ltr"]')?.parentElement;
    if (!nameLine) return;
    let box = old;
    if (box && (box.parentElement !== nameLine || box.dataset.handle !== activeHandle)) {box.remove();box=null;}
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
      for (const [label,value,icon] of [['Based in',state.basedIn,'globe'],['Connected via',state.connectedVia,'device']]) {
        const badge=document.createElement('span');badge.className='xtrim-about-badge';
        badge.setAttribute('aria-label', label + ': ' + (value || 'Not provided'));
        badge.title=label + ': ' + (value || 'Not provided') + ' · From X’s About this account panel' + (state.approximate && label==='Based in' ? ' · X marks this location as approximate' : '');
        const graphic=document.createElementNS('http://www.w3.org/2000/svg','svg');graphic.setAttribute('viewBox','0 0 24 24');graphic.setAttribute('aria-hidden','true');
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',icon==='globe'?'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-9 9h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18':'M7 3h10v18H7zM10 17h4');
        graphic.append(path);
        const text=document.createElement('span');text.className='xtrim-about-value';text.textContent=value || 'Not provided';
        badge.append(graphic,text);box.append(badge);
      }
    } else {
      const note=document.createElement('span');note.className='xtrim-about-note';note.textContent=(errors[state.error] || errors.unavailable) + (state.httpStatus ? ' (HTTP ' + state.httpStatus + ')' : '');note.title=note.textContent;box.append(note);
    }

  }
  browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false}).then(prefs=>{preferences=prefs;enabled=prefs.enabled;render();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||(!changes.enabled&&!changes.profileAbout&&!changes.postAbout))return;
    browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false}).then(prefs=>{preferences=prefs;enabled=prefs.enabled;render();});
  });
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;render();},100);}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',render);
})();
