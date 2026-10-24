// X opens many popups on a URL of their own (/settings/profile for Edit profile,
// /compose/post, /name/status/1/photo/1, ...) while the page underneath stays rendered.
// Page-level features ask xtrimPagePath() instead of location.pathname, so the page
// behind an open popup keeps X Trim's changes. Shared by every content script.
(() => {
  // Popup routes X may set a moment before their dialog mounts.
  const popupRoute = /^\/(?:compose\/|settings\/profile\/?$|i\/(?:display|keyboard_shortcuts|flow\/|lists\/add_member)|[a-z0-9_]{1,15}\/status\/\d+\/(?:photo|video)\/\d+)/i;
  // Dialogs that were already open on an accepted page: drawers and confirmations
  // that never changed the URL, so they never hold the page.
  const seen = new WeakSet();
  let page = null, previous = null, changedAt = 0;
  globalThis.xtrimPagePath = () => {
    const path = location.pathname;
    const dialogs = [...document.querySelectorAll('#layers [aria-modal="true"]')];
    const fresh = dialogs.some(dialog => !seen.has(dialog));
    if (page === null) {
      if (popupRoute.test(path)) return /^\/compose\//.test(path) ? '/home' : path;
    } else if (path !== page && (fresh || popupRoute.test(path))) return page;
    else if (path === page && fresh && previous !== null && Date.now() - changedAt < 1000) {
      // The URL changed just before the popup's dialog mounted: it belongs to the page before.
      page = previous; previous = null;
      return page;
    }
    if (path !== page) { previous = page; page = path; changedAt = Date.now(); }
    dialogs.forEach(dialog => seen.add(dialog));
    return path;
  };
})();
