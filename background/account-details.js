// X's public web-client token, not a developer API key. Session headers stay in memory.
const WEB_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
let queryId = 'XRqGa7EeokUU5kppkh13EA';
const sessionHeaders = new Map(), pending = new Map(), accountProfiles = new Map();
let queue = Promise.resolve(), lastStart = 0, accountCooldown = 0;
const TTL = 24 * 60 * 60 * 1000;
function parseAbout(data, handle) {
  const user = data?.data?.user_result_by_screen_name?.result;
  const returned = user?.core?.screen_name || user?.legacy?.screen_name;
  if (returned && returned.toLowerCase() !== handle.toLowerCase()) throw new Error('account-mismatch');
  if (!user?.about_profile) throw new Error(data?.errors?.length ? 'request-rejected' : 'not-available');
  const text = value => typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : null;
  const legacy=user.legacy || {}, core=user.core || {};
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  const label=user.affiliates_highlighted_label?.label;
  return { basedIn:text(user.about_profile.account_based_in), connectedVia:text(user.about_profile.source), approximate:user.about_profile.location_accurate===false,
    name:text(core.name || legacy.name), createdAt:text(core.created_at || legacy.created_at), userId:text(user.rest_id),
    verification:['Business','Government'].includes(user.verification?.verified_type)?user.verification.verified_type:user.is_blue_verified===true?'Blue':null,
    handleChanges:count(user.about_profile.username_changes?.count), affiliation:text(label?.description || user.about_profile.affiliate_username),
    followers:count(legacy.followers_count), following:count(legacy.friends_count), posts:count(legacy.statuses_count), media:count(legacy.media_count) };
}
// Enrich only from responses X already loaded. Keep these changing counts in tab memory.
function rememberAccountProfiles(root,tabId){
  if(!captureAccountHeaders)return;
  const cache=accountProfiles.get(tabId)||new Map(), stack=[root];
  while(stack.length){
    const user=stack.pop();if(!user||typeof user!=='object')continue;
    const handle=user.core?.screen_name||user.legacy?.screen_name;
    if(typeof handle==='string'&&/^[a-z0-9_]{1,15}$/i.test(handle)&&user.rest_id){
      const legacy=user.legacy||{}, entry={};
      for(const [key,field] of [['followers','followers_count'],['following','friends_count'],['posts','statuses_count'],['media','media_count']]){
        if(Number.isSafeInteger(legacy[field])&&legacy[field]>=0)entry[key]=legacy[field];
      }
      if(Object.keys(entry).length){cache.delete(handle.toLowerCase());cache.set(handle.toLowerCase(),entry);}
    }
    for(const child of Object.values(user))if(child&&typeof child==='object')stack.push(child);
  }
  while(cache.size>100)cache.delete(cache.keys().next().value);
  accountProfiles.set(tabId,cache);
  browser.tabs.sendMessage(tabId,{type:'about-profile-counts',profiles:Object.fromEntries(cache)}).catch(()=>{});

}
let captureAccountHeaders=false;
async function updateAccountCapture(){
  const prefs=await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false,geoBlocking:false});
  captureAccountHeaders=prefs.enabled&&(prefs.profileAbout||prefs.postAbout||prefs.geoBlocking)&&await hasDataConsent(ACCOUNT_DATA_TYPES);
  if(!captureAccountHeaders){sessionHeaders.clear();accountProfiles.clear();}
}
updateAccountCapture();
browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.enabled||changes.profileAbout||changes.postAbout||changes.geoBlocking))updateAccountCapture();});
browser.permissions.onAdded.addListener(updateAccountCapture);
browser.permissions.onRemoved.addListener(updateAccountCapture);
browser.webRequest.onBeforeSendHeaders.addListener(details => {
  const match = details.url.match(/\/graphql\/([^/]+)\/AboutAccountQuery/);
  if (match) queryId = match[1];
  if (details.tabId < 0 || !captureAccountHeaders) return;
  const allowed = new Set(['authorization','x-csrf-token','x-twitter-auth-type','x-twitter-active-user','x-twitter-client-language']);
  const headers = {};
  for (const header of details.requestHeaders || []) {
    const key = header.name.toLowerCase();
    if (allowed.has(key)) headers[key] = header.value;
  }
  if (headers.authorization && headers['x-csrf-token']) sessionHeaders.set(details.tabId, headers);
}, {urls:['https://x.com/i/api/*','https://twitter.com/i/api/*']}, ['requestHeaders']);
browser.tabs.onRemoved.addListener(tabId => {sessionHeaders.delete(tabId);accountProfiles.delete(tabId);});
async function lookupAbout(message, sender) {
  if (!sender.tab || !sender.url) return {ok:false, error:'invalid-page'};
  // SPA navigation can leave the document sender URL behind the current tab URL.
  const page = new URL(sender.tab.url || sender.url);
  const handle = String(message.handle || '');
  if (page.protocol !== 'https:' || !['x.com','twitter.com'].includes(page.hostname) || !/^[a-z0-9_]{1,15}$/i.test(handle) || (message.timeline !== true && page.pathname.split('/')[1]?.toLowerCase() !== handle.toLowerCase())) return {ok:false,error:'invalid-page'};
  const postPage = /^\/[a-z0-9_]{1,15}\/status\/\d+(?:\/(?:photo|video)\/\d+)?\/?$/i.test(page.pathname);
  const scope = message.timeline === true ? 'geoBlocking' : postPage ? 'postAbout' : 'profileAbout';
  const preferences = await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false,geoBlocking:false});
  if (!preferences.enabled || !preferences[scope]) return {ok:false,error:'disabled'};
  if(!await hasDataConsent(ACCOUNT_DATA_TYPES))return {ok:false,error:'consent-required'};
  const privateWindow=!!sender.tab.incognito;
  const key = page.origin + '/' + handle.toLowerCase();
  const pendingKey=privateWindow?'private:'+sender.tab.id+':'+key:key;
  const store = await browser.storage.local.get({aboutCache:{},aboutCooldown:0});
  const cached = privateWindow?null:store.aboutCache[key];
  if (!message.refresh && cached && Date.now() - cached.fetchedAt < TTL) return {ok:true,...cached,...accountProfiles.get(sender.tab.id)?.get(handle.toLowerCase()),cached:true};
  if (Math.max(store.aboutCooldown,accountCooldown) > Date.now()) return {ok:false,error:'rate-limited'};
  if (pending.has(pendingKey)) return pending.get(pendingKey);
  if(pending.size>=30)return {ok:false,error:'busy'};
  const operation = queue.then(async () => {
    const now = await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false,geoBlocking:false,aboutCooldown:0});
    if(!await hasDataConsent(ACCOUNT_DATA_TYPES))return {ok:false,error:'consent-required'};
    if (!now.enabled || !now[scope]) return {ok:false,error:'disabled'};
    if (Math.max(now.aboutCooldown,accountCooldown) > Date.now()) return {ok:false,error:'rate-limited'};
    const headers = {...(sessionHeaders.get(sender.tab.id) || {})};
    if (!headers.authorization) headers.authorization = WEB_TOKEN;
    if (!headers['x-csrf-token'] && typeof message.csrf === 'string' && /^[a-z0-9]{16,256}$/i.test(message.csrf)) headers['x-csrf-token'] = message.csrf;
    if (!headers['x-csrf-token']) return {ok:false,error:'sign-in'};
    headers['x-twitter-active-user'] = 'yes'; headers['x-twitter-auth-type'] = 'OAuth2Session'; headers['x-twitter-client-language'] = 'en';
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1500 - (Date.now() - lastStart))));
    // Consent/preferences may have changed while waiting in the request queue.
    if(!await hasDataConsent(ACCOUNT_DATA_TYPES))return {ok:false,error:'consent-required'};
    const latest=await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false,geoBlocking:false});
    if(!latest.enabled||!latest[scope])return {ok:false,error:'disabled'};
    lastStart = Date.now();
    const url = new URL('/i/api/graphql/' + queryId + '/AboutAccountQuery', page.origin);
    url.searchParams.set('variables', JSON.stringify({screenName:handle}));
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      let reply;
      try {
        const response = await fetch(url.href, {method:'GET',credentials:'include',headers,signal:controller.signal});
        reply = {status:response.status, reset:response.headers.get('x-rate-limit-reset'), retry:response.headers.get('retry-after'), body:response.ok ? await response.text() : ''};
      } catch (error) {
        if (error.name === 'AbortError') return {ok:false,error:'timeout'};
        // Privacy settings or other extensions can block this background request while X's own tab still reaches X.
        // Ask the tab to make the same request as the page, to the same address with the same headers.
        console.warn('X Trim: account-details request failed in the background, retrying from the X tab.', error);
        reply = await Promise.race([
          browser.tabs.sendMessage(sender.tab.id, {type:'about-fetch', url:url.href, headers}, {frameId:0}).catch(() => null),
          new Promise(resolve => setTimeout(() => resolve({timeout:true}), 12000))
        ]);
        if (reply?.timeout) return {ok:false,error:'timeout'};
        if (!reply || typeof reply.status !== 'number') return {ok:false,error:'network-error'};
      }
      if (reply.status === 429) {
        const reset = Number(reply.reset) * 1000;
        const retry = Number(reply.retry) * 1000;
        accountCooldown=Math.max(Date.now() + 60000, Number.isFinite(reset) ? reset : 0, Date.now() + (Number.isFinite(retry) ? retry : 0));
        if(!privateWindow)await browser.storage.local.set({aboutCooldown:accountCooldown});
        return {ok:false,error:'rate-limited'};
      }
      if (reply.status < 200 || reply.status > 299) return {ok:false,httpStatus:reply.status,error:reply.status === 401 ? 'sign-in' : reply.status === 403 ? 'request-rejected' : reply.status === 404 ? 'endpoint-changed' : 'http-error'};
      let data;
      try { data = JSON.parse(reply.body); } catch { return {ok:false,error:'bad-response'}; }
      const result = {...parseAbout(data, handle), fetchedAt:Date.now()};
      if(privateWindow)return {ok:true,...result,...accountProfiles.get(sender.tab.id)?.get(handle.toLowerCase())};
      const current = await browser.storage.local.get({aboutCache:{}});
      current.aboutCache[key] = result;
      const entries = Object.entries(current.aboutCache).filter(([,entry])=>Date.now()-entry.fetchedAt<TTL).sort((a,b)=>b[1].fetchedAt-a[1].fetchedAt).slice(0,100);
      await browser.storage.local.set({aboutCache:Object.fromEntries(entries)});
      return {ok:true,...result,...accountProfiles.get(sender.tab.id)?.get(handle.toLowerCase())};
    } catch (error) {
      if (!['account-mismatch','not-available','request-rejected'].includes(error.message)) console.warn('X Trim: account-details lookup failed.', error);
      return {ok:false,error:['account-mismatch','not-available','request-rejected'].includes(error.message) ? error.message : 'unavailable'};
    } finally {clearTimeout(timeout);}
  });
  pending.set(pendingKey,operation); queue = operation.catch(()=>{});
  try {return await operation;} finally {pending.delete(pendingKey);}
}
browser.runtime.onMessage.addListener((message,sender) => {
  if (message.type === 'about-lookup') return lookupAbout(message,sender);
});
