// X's public web-client token, not a developer API key. Session headers stay in memory.
const WEB_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
let queryId = 'XRqGa7EeokUU5kppkh13EA';
const sessionHeaders = new Map(), pending = new Map();
let queue = Promise.resolve(), lastStart = 0;
const TTL = 24 * 60 * 60 * 1000;
function parseAbout(data, handle) {
  const user = data?.data?.user_result_by_screen_name?.result;
  const returned = user?.core?.screen_name || user?.legacy?.screen_name;
  if (returned && returned.toLowerCase() !== handle.toLowerCase()) throw new Error('account-mismatch');
  if (!user?.about_profile) throw new Error(data?.errors?.length ? 'request-rejected' : 'not-available');
  const text = value => typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : null;
  return { basedIn: text(user.about_profile.account_based_in), connectedVia: text(user.about_profile.source), approximate: user.about_profile.location_accurate === false };
}
browser.webRequest.onBeforeSendHeaders.addListener(details => {
  const match = details.url.match(/\/graphql\/([^/]+)\/AboutAccountQuery/);
  if (match) queryId = match[1];
  if (details.tabId < 0) return;
  const allowed = new Set(['authorization','x-csrf-token','x-twitter-auth-type','x-twitter-active-user','x-twitter-client-language']);
  const headers = {};
  for (const header of details.requestHeaders || []) {
    const key = header.name.toLowerCase();
    if (allowed.has(key)) headers[key] = header.value;
  }
  if (headers.authorization && headers['x-csrf-token']) sessionHeaders.set(details.tabId, headers);
}, {urls:['https://x.com/i/api/*','https://twitter.com/i/api/*']}, ['requestHeaders']);
browser.tabs.onRemoved.addListener(tabId => sessionHeaders.delete(tabId));
async function lookupAbout(message, sender) {
  if (!sender.tab || !sender.url) return {ok:false, error:'invalid-page'};
  // SPA navigation can leave the document sender URL behind the current tab URL.
  const page = new URL(sender.tab.url || sender.url);
  const handle = String(message.handle || '');
  if (!['x.com','twitter.com'].includes(page.hostname) || !/^[a-z0-9_]{1,15}$/i.test(handle) || page.pathname.split('/')[1]?.toLowerCase() !== handle.toLowerCase()) return {ok:false,error:'invalid-page'};
  const postPage = /^\/[a-z0-9_]{1,15}\/status\/\d+(?:\/(?:photo|video)\/\d+)?\/?$/i.test(page.pathname);
  const scope = postPage ? 'postAbout' : 'profileAbout';
  const preferences = await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false});
  if (!preferences.enabled || !preferences[scope]) return {ok:false,error:'disabled'};
  const key = page.origin + '/' + handle.toLowerCase();
  const store = await browser.storage.local.get({aboutCache:{},aboutCooldown:0});
  const cached = store.aboutCache[key];
  if (!message.refresh && cached && Date.now() - cached.fetchedAt < TTL) return {ok:true,...cached,cached:true};
  if (store.aboutCooldown > Date.now()) return {ok:false,error:'rate-limited'};
  if (pending.has(key)) return pending.get(key);
  const operation = queue.then(async () => {
    const now = await browser.storage.local.get({enabled:true,profileAbout:false,postAbout:false,aboutCooldown:0});
    if (!now.enabled || !now[scope]) return {ok:false,error:'disabled'};
    if (now.aboutCooldown > Date.now()) return {ok:false,error:'rate-limited'};
    const headers = {...(sessionHeaders.get(sender.tab.id) || {})};
    if (!headers.authorization) headers.authorization = WEB_TOKEN;
    if (!headers['x-csrf-token'] && typeof message.csrf === 'string' && /^[a-z0-9]{16,256}$/i.test(message.csrf)) headers['x-csrf-token'] = message.csrf;
    if (!headers['x-csrf-token']) return {ok:false,error:'sign-in'};
    headers['x-twitter-active-user'] = 'yes'; headers['x-twitter-auth-type'] = 'OAuth2Session'; headers['x-twitter-client-language'] = 'en';
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1500 - (Date.now() - lastStart))));
    lastStart = Date.now();
    const url = new URL('/i/api/graphql/' + queryId + '/AboutAccountQuery', page.origin);
    url.searchParams.set('variables', JSON.stringify({screenName:handle}));
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url.href, {method:'GET',credentials:'include',headers,signal:controller.signal});
      if (response.status === 429) {
        const reset = Number(response.headers.get('x-rate-limit-reset')) * 1000;
        const retry = Number(response.headers.get('retry-after')) * 1000;
        await browser.storage.local.set({aboutCooldown:Math.max(Date.now() + 60000, Number.isFinite(reset) ? reset : 0, Date.now() + (Number.isFinite(retry) ? retry : 0))});
        return {ok:false,error:'rate-limited'};
      }
      if (!response.ok) return {ok:false,httpStatus:response.status,error:response.status === 401 ? 'sign-in' : response.status === 403 ? 'request-rejected' : response.status === 404 ? 'endpoint-changed' : 'http-error'};
      const result = {...parseAbout(await response.json(), handle), fetchedAt:Date.now()};
      const current = await browser.storage.local.get({aboutCache:{}});
      current.aboutCache[key] = result;
      const entries = Object.entries(current.aboutCache).sort((a,b)=>b[1].fetchedAt-a[1].fetchedAt).slice(0,100);
      await browser.storage.local.set({aboutCache:Object.fromEntries(entries)});
      return {ok:true,...result};
    } catch (error) {
      return {ok:false,error:['account-mismatch','not-available','request-rejected'].includes(error.message) ? error.message : error.name === 'AbortError' ? 'timeout' : 'network-error'};
    } finally {clearTimeout(timeout);}
  });
  pending.set(key,operation); queue = operation.catch(()=>{});
  try {return await operation;} finally {pending.delete(key);}
}
browser.runtime.onMessage.addListener((message,sender) => {
  if (message.type === 'about-lookup') return lookupAbout(message,sender);
});
