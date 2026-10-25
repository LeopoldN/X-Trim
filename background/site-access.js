// The browser can leave X Trim's X access at "only when clicked". Content scripts then
// wait for a toolbar click on every visit, and background requests to X fail.
// Flag the toolbar button until access is always on; the popup offers the fix.
const xSiteAccess = {origins:['https://x.com/*','https://twitter.com/*']};
async function flagSiteAccess() {
  const allowed = await browser.permissions.contains(xSiteAccess).catch(() => true);
  browser.action.setBadgeText({text:allowed ? '' : '!'}).catch(() => {});
  if (!allowed) browser.action.setBadgeBackgroundColor({color:'#7FD8BE'}).catch(() => {});
}
flagSiteAccess();
browser.permissions.onAdded.addListener(flagSiteAccess);
browser.permissions.onRemoved.addListener(flagSiteAccess);
