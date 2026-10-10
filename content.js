(() => {
  const defaults = { themeMode:'default', themeCustom:{accent:'#1D9BF0'}, enabled: true, premium: true, hideRightColumn: false, follow: true, trends: false, floatingGrok: false, floatingMessages: false, twitterLogo: false, settingsShortcut: false, moreOptions: [], added: [], postAbout: false, profileAbout: false, profileCustomWidth: false, profileWidth: 800, profileFont: "default", profilePostCount: false, profileSquareAvatar: false, profileAvatarBorder: false, profileAvatarBorderColor: "#1DA1F2", customWidths: false, navWidth: 272, feedWidth: 600, rightWidth: 350, hidden: [] };
  let settings = defaults, timer;
  const style = document.createElement('style');
  style.textContent = "[data-xtrim-hidden] { display: none !important; }\nhtml[data-xtrim-twitter] header[role=\"banner\"] h1 a[href=\"/home\"] { position: relative; }\nhtml[data-xtrim-twitter] header[role=\"banner\"] h1 a[href=\"/home\"] svg { visibility: hidden !important; }\nhtml[data-xtrim-twitter] header[role=\"banner\"] h1 a[href=\"/home\"]::before { content: ''; position: absolute; width: 30px; height: 30px; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #1da1f2; mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M23.954%204.57a10%2010%200%200%201-2.825.775%204.958%204.958%200%200%200%202.163-2.723%209.99%209.99%200%200%201-3.127%201.195%204.916%204.916%200%200%200-8.384%204.482A13.944%2013.944%200%200%201%201.64%203.162a4.916%204.916%200%200%200%201.523%206.574%204.904%204.904%200%200%201-2.229-.616v.061a4.917%204.917%200%200%200%203.946%204.818%204.936%204.936%200%200%201-2.224.084%204.923%204.923%200%200%200%204.6%203.419A9.868%209.868%200%200%201%200%2019.54a13.94%2013.94%200%200%200%207.548%202.212c9.057%200%2014.01-7.503%2014.01-14.01%200-.213-.005-.425-.014-.637a10.012%2010.012%200%200%200%202.46-2.548z%22%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat; pointer-events: none; }";
  document.documentElement.append(style);
  const navSelector = 'header[role="banner"] nav a, header[role="banner"] nav button, header[role="banner"] [data-testid="SideNav_NewTweet_Button"], header[role="banner"] [data-testid="SideNav_AccountSwitcher_Button"]';
  const label = el => {
    const names = {
      AppTabBar_Home_Link: 'Home', AppTabBar_Explore_Link: 'Explore',
      AppTabBar_Notifications_Link: 'Notifications', AppTabBar_DirectMessage_Link: 'Chat',
      AppTabBar_Profile_Link: 'Profile', AppTabBar_More_Menu: 'More',
      SideNav_NewTweet_Button: 'Post', SideNav_AccountSwitcher_Button: 'Account menu'
    };
    if (el.getAttribute('data-xtrim-settings-link')) return 'Settings';
    return names[el.getAttribute('data-testid')] ||
      (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
  };
  const key = el => el.getAttribute('data-xtrim-nav-key') || (el.tagName === 'A' ? new URL(el.href).pathname.replace(/\/$/, '') || '/' : el.getAttribute('data-testid') || label(el));
  function items() {
    const entries = new Map();
    for (const el of document.querySelectorAll(navSelector)) {
      if (el.hasAttribute('data-xtrim-added')) continue;
      const itemKey = key(el);
      entries.set(itemKey, { key: itemKey, label: label(el) || itemKey });
    }
    return [...entries.values()];
  }
  // A hidden section can sit inside several border/padding-only wrappers.
  // Collapse only wrappers whose remaining descendants have no visible content.
  function collapseSidebarWrappers() {
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;
    function hasContent(node) {
      if (node.nodeType === Node.TEXT_NODE) return !!node.textContent.trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      if (node.hasAttribute('data-xtrim-hidden')) return false;
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden') return false;
      if (node.matches('input, textarea, button, img, svg, video, canvas, iframe, [role="search"]')) return true;
      return [...node.childNodes].some(hasContent);
    }
    for (const hidden of sidebar.querySelectorAll('[data-xtrim-hidden]')) {
      let parent = hidden.parentElement;
      while (parent && parent !== sidebar) {
        if (hasContent(parent)) break;
        parent.setAttribute('data-xtrim-hidden', '');
        parent = parent.parentElement;
      }
    }
  }
  function hideFloatingDrawers() {
    const drawers = [
      ['floatingGrok', '[data-testid="GrokDrawer"]'],
      ['floatingMessages', '[data-testid="chat-drawer-root"], [data-testid="DMDrawer"]']
    ];
    for (const [setting, selector] of drawers) {
      if (!settings[setting]) continue;
      document.querySelectorAll(selector).forEach(drawer => {
        const positionedWrapper = drawer.closest('[style*="position: absolute"][style*="bottom:"]');
        const target = positionedWrapper && positionedWrapper.closest('#layers') ? positionedWrapper : drawer;
        target.setAttribute('data-xtrim-hidden', '');
      });
    }
  }
  function updateSettingsShortcut() {
    const original = document.querySelector('header[role="banner"] nav button[data-testid="AppTabBar_More_Menu"]');
    const existing = document.querySelector('header[role="banner"] [data-xtrim-settings-link]');
    if (!settings.enabled || !settings.settingsShortcut) {
      if (existing) existing.remove();
      return;
    }
    if (!original) { if (existing) existing.remove(); return; }
    const compact = /^\/(?:i\/chat|messages)(?:\/|$)/.test(location.pathname);
    const signature = (compact ? 'compact:' : 'full:') + original.className + original.innerHTML;
    if (existing && (existing.previousElementSibling !== original || existing.getAttribute('data-xtrim-source') !== signature)) existing.remove();
    if (!original.nextElementSibling?.hasAttribute('data-xtrim-settings-link')) {
      const link = document.createElement('a');
      link.className = original.className;
      link.href = '/settings/account';
      link.setAttribute('role', 'link');
      link.setAttribute('aria-label', 'Settings');
      link.setAttribute('title', 'Settings');
      link.setAttribute('data-xtrim-settings-link', 'true');
      link.setAttribute('data-xtrim-source', signature);
      if (compact) link.setAttribute('data-xtrim-compact', '');
      link.setAttribute('data-xtrim-nav-key', 'AppTabBar_More_Menu');
      for (const child of original.childNodes) link.append(child.cloneNode(true));
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.trim() === 'More') walker.currentNode.textContent = compact ? '' : 'Settings';
      }
      const svg = link.querySelector('svg');
      if (svg) {
        const gear = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        gear.setAttribute('d', 'M9 3h6l.6 2.4 2.1 1.2 2.4-.7 3 5.2-1.8 1.7v2.4l1.8 1.7-3 5.2-2.4-.7-2.1 1.2L15 25H9l-.6-2.4-2.1-1.2-2.4.7-3-5.2 1.8-1.7v-2.4L.9 11.1l3-5.2 2.4.7 2.1-1.2L9 3z');
        gear.setAttribute('fill', 'none'); gear.setAttribute('stroke', 'currentColor'); gear.setAttribute('stroke-width', '1.6');
        const hole = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hole.setAttribute('cx', '12'); hole.setAttribute('cy', '14'); hole.setAttribute('r', '4');
        hole.setAttribute('fill', 'none'); hole.setAttribute('stroke', 'currentColor'); hole.setAttribute('stroke-width', '1.6');
        svg.setAttribute('viewBox', '0 0 24 28');
        svg.replaceChildren(gear, hole);
      }
      original.after(link);
    }
    original.setAttribute('data-xtrim-hidden', '');
  }
  function readMoreMenu() {
    const more = document.querySelector('header[role="banner"] button[data-testid="AppTabBar_More_Menu"]');
    if (!more || more.getAttribute('aria-expanded') !== 'true') return settings.moreOptions;
    const found = new Map(settings.moreOptions.map(item => [item.key, item]));
    document.querySelectorAll('#layers a[href], [role="menu"] a[href]').forEach(link => {
      if (link.closest('[data-testid="GrokDrawer"], [data-testid="chat-drawer-root"], [data-testid="DMDrawer"]')) return;
      if (!link.getClientRects().length) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/')) return;
      const title = (link.innerText || link.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (!title) return;
      const itemKey = url.pathname + url.search;
      found.set(itemKey, {key: itemKey, label: title});
    });
    const next = [...found.values()];
    if (JSON.stringify(next) !== JSON.stringify(settings.moreOptions)) {
      settings.moreOptions = next;
      browser.storage.local.set({moreOptions: next});
    }
    return next;
  }
  function updateAddedNavigation() {
    const nav = document.querySelector('header[role="banner"] nav');
    if (!nav) return;
    const nativePaths = new Set([...nav.querySelectorAll('a:not([data-xtrim-added])')].map(link => new URL(link.href).pathname + new URL(link.href).search));
    const selected = settings.enabled ? settings.moreOptions.filter(item => settings.added.includes(item.key) && !nativePaths.has(item.key)) : [];
    const wanted = new Map(selected.map(item => [item.key, item]));
    nav.querySelectorAll('[data-xtrim-added]').forEach(link => {
      if (!wanted.has(link.getAttribute('data-xtrim-added'))) link.remove();
    });
    const template = nav.querySelector('a:not([data-xtrim-added]):not([data-xtrim-settings-link])');
    if (!template) return;
    for (const item of selected) {
      const url = new URL(item.key, location.origin);
      if (url.origin !== location.origin || !item.key.startsWith('/')) continue;
      // Native links already on the sidebar do not need another copy.
      if ([...nav.querySelectorAll('a:not([data-xtrim-added])')].some(link => new URL(link.href).pathname + new URL(link.href).search === item.key)) continue;
      if ([...nav.querySelectorAll('[data-xtrim-added]')].some(link => link.getAttribute('data-xtrim-added') === item.key)) continue;
      const link = document.createElement('a');
      link.className = template.className;
      link.href = url.href;
      link.setAttribute('aria-label', item.label);
      link.setAttribute('title', item.label);
      link.setAttribute('role', 'link');
      link.setAttribute('data-xtrim-added', item.key);
      for (const child of template.childNodes) link.append(child.cloneNode(true));
      link.querySelectorAll('[aria-label*="unread"]').forEach(el => el.remove());
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) walker.currentNode.textContent = item.label;
      const svg = link.querySelector('svg');
      if (svg) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 12h14m-6-6 6 6-6 6');
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '2');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.replaceChildren(path);
      }
      nav.append(link);
    }
  }
  function isProfilePage() {
    const parts = location.pathname.split('/').filter(Boolean);
    const reserved = new Set(['home','explore','notifications','messages','i','settings','search','compose','login','logout']);
    return !!parts.length && !reserved.has(parts[0].toLowerCase()) &&
      (parts.length === 1 || (parts.length === 2 && ['with_replies','media','likes','highlights','articles'].includes(parts[1]))) &&
      !!document.querySelector('[data-testid="primaryColumn"] [data-testid="UserName"]') &&
      !!document.querySelector('[data-testid="primaryColumn"] nav[aria-label="Profile timelines"]');
  }
  const profileStyle = document.createElement('style');
  document.documentElement.append(profileStyle);
  function updateProfile() {
    const active = settings.enabled && isProfilePage();
    document.documentElement.toggleAttribute('data-xtrim-profile', active);
    let css = '';
    const scope = 'html[data-xtrim-profile]';
    if (active) {
      const fonts = {system:'system-ui, sans-serif', arial:'Arial, Helvetica, sans-serif', serif:'Georgia, serif', mono:'Menlo, Consolas, monospace'};
      if (fonts[settings.profileFont]) css += `${scope} [data-testid="primaryColumn"], ${scope} [data-testid="primaryColumn"] :is(div,span,a,button,input,textarea) {font-family:${fonts[settings.profileFont]} !important;}`;
      const handle = location.pathname.split('/')[1];
      const photo = [...document.querySelectorAll('[data-testid="primaryColumn"] a[href]')]
        .find(link => new URL(link.href).pathname === '/' + handle + '/photo');
      const avatar = photo?.closest('[data-testid^="UserAvatar-Container-"]');
      if (avatar) avatar.setAttribute('data-xtrim-profile-avatar', '');
      const avatarScope = `${scope} [data-xtrim-profile-avatar]`;
      if (settings.profileSquareAvatar) css += `${avatarScope}, ${avatarScope} * {border-radius:0 !important;}`;
      if (settings.profileAvatarBorder) {
        const accent=settings.themeMode==='custom'?settings.themeCustom?.accent:'#1D9BF0';
        const color = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#1D9BF0';
        // Recolor the existing outer ring, behind the smaller photo layer.
        css += `${avatarScope} a[href$="/photo"] > div:first-child > div {background-color:${color} !important;}`;
      }

    }
    const primary = document.querySelector('[data-testid="primaryColumn"]');
    const existing = document.querySelector('[data-xtrim-profile-posts]');
    if (!active || !settings.profilePostCount) {
      if (existing) existing.remove();
    } else if (primary) {
      const handle = location.pathname.split('/')[1];
      const followers = [...primary.querySelectorAll('a[href]')].find(link => {
        const path = new URL(link.href).pathname;
        return path === '/' + handle + '/verified_followers' || path === '/' + handle + '/followers';
      });
      const source = [...primary.querySelectorAll('h2')].map(heading => heading.nextElementSibling)
        .find(el => el && /^[\d,.]+[KM]?\s+posts?$/i.test(el.textContent.trim()));
      if (followers && source) {
        source.setAttribute('data-xtrim-profile-post-source', '');
        let count = existing;
        if (!count || count.previousElementSibling !== followers.parentElement) {
          if (count) count.remove();
          count = document.createElement('div');
          count.className = followers.parentElement.className;
          count.setAttribute('data-xtrim-profile-posts', '');
          followers.parentElement.after(count);
        }
        const match = source.textContent.trim().match(/^([\d,.]+[KM]?)\s+(posts?)$/i);
        const text = match[1] + ' Posts';
        if (count.textContent !== text) {
          const stat = document.createElement('span');
          stat.className = followers.className;
          if (followers.getAttribute('style')) stat.setAttribute('style', followers.getAttribute('style'));
          const nativeSpans = [...followers.children].filter(el => el.tagName === 'SPAN');
          const number = nativeSpans[0] ? nativeSpans[0].cloneNode(true) : document.createElement('span');
          const caption = nativeSpans[1] ? nativeSpans[1].cloneNode(true) : document.createElement('span');
          number.textContent = match[1]; caption.textContent = 'Posts';
          stat.append(number, document.createTextNode(' '), caption);
          count.replaceChildren(stat);
        }
        css += `${scope} [data-xtrim-profile-post-source]{display:none !important;} ${scope} [data-xtrim-profile-posts]{margin-left:20px;white-space:nowrap;} `;
      } else if (existing) existing.remove();
    }
    if (profileStyle.textContent !== css) profileStyle.textContent = css;
  }
  const widthStyle = document.createElement('style');
  document.documentElement.append(widthStyle);
  function updateWidths() {
    const bounds = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
    let css = '';
    const profile = isProfilePage();
    if (settings.enabled && (settings.customWidths || settings.hideRightColumn || (profile && settings.profileCustomWidth))) {
      // Choose the native responsive rail before X mounts; never measure our own overrides.
      const nativeNavWidth = window.matchMedia('(min-width: 1265px)').matches ? 275 : 88;
      const nav = settings.customWidths ? bounds(settings.navWidth, 272, 72, 360) : nativeNavWidth;
      const feed = profile && settings.profileCustomWidth ? bounds(settings.profileWidth, 800, 360, 1200) : (settings.customWidths ? bounds(settings.feedWidth, 600, 360, 1200) : 600);
      const hideRight = settings.hideRightColumn;
      const right = hideRight ? 0 : bounds(settings.rightWidth, 350, 240, 600);
      const gap = hideRight ? 0 : 32;
      const primary = document.querySelector('[data-testid="primaryColumn"]');
      if (primary?.parentElement) primary.parentElement.setAttribute('data-xtrim-columns', '');
      const main = document.querySelector('main[role="main"]');
      const header = document.querySelector('header[role="banner"]');
      if (header?.parentElement && header.parentElement === main?.parentElement) {
        header.parentElement.setAttribute('data-xtrim-page-row', '');
      }
      if (main) {
        for (let wrapper = primary?.parentElement; wrapper && wrapper !== main; wrapper = wrapper.parentElement) {
          wrapper.setAttribute('data-xtrim-layout-wrapper', '');
        }
      }
      css = `@media (min-width: 700px) {
        [data-xtrim-page-row] { justify-content: center !important; width: 100% !important; }
        header[role="banner"] { width: ${nav}px !important; min-width: ${nav}px !important; flex: 0 0 ${nav}px !important; }
        header[role="banner"] > div, header[role="banner"] > div > div, header[role="banner"] > div > div > div { width: ${nav}px !important; max-width: ${nav}px !important; }
        header[role="banner"] nav { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
        header[role="banner"] nav > :is(a,button) { max-width:100% !important; box-sizing:border-box !important; }
        main[role="main"] { width: ${feed + right + gap}px !important; max-width: none !important; flex: 0 0 auto !important; min-width: 0 !important; }
        [data-xtrim-layout-wrapper] { width: 100% !important; max-width: none !important; min-width: 0 !important; }
        [data-xtrim-columns] { gap: ${gap}px !important; justify-content: flex-start !important; }
        [data-testid="primaryColumn"] { width: ${feed}px !important; max-width: ${feed}px !important; min-width: 0 !important; flex: 0 0 ${feed}px !important; margin-left: 0 !important; margin-right: 0 !important; }
        [data-testid="sidebarColumn"] { width: ${right}px !important; max-width: ${right}px !important; min-width: 0 !important; margin-left: 0 !important; flex: 0 0 ${right}px !important; }
        [data-testid="sidebarColumn"] > div > div { max-width: 100% !important; }
        html[data-xtrim-profile] [data-testid="primaryColumn"] .r-1ye8kvj.r-13qz1uu { width:100% !important; max-width:100% !important; margin-left:0 !important; margin-right:0 !important; }
      }
      @media (min-width: 700px) and (max-width: ${nav + feed + right + 55}px) {
        [data-testid="sidebarColumn"] { display: none !important; }
        main[role="main"] { width: min(${feed}px, calc(100vw - ${nav + 24}px)) !important; }
        [data-xtrim-columns] { gap: 0 !important; }
        [data-testid="primaryColumn"] { width: 100% !important; max-width: 100% !important; flex-basis: 100% !important; }
      }`;
    }
    if (widthStyle.textContent !== css) widthStyle.textContent = css;
  }
  function updateEarlyPreferences() {
    const root = document.documentElement;
    const parts = location.pathname.split('/').filter(Boolean);
    const reserved = new Set(['home','explore','notifications','messages','i','settings','search','compose','login','logout']);
    const profileRoute = !!parts.length && !reserved.has(parts[0].toLowerCase()) &&
      (parts.length === 1 || (parts.length === 2 && ['with_replies','media','likes','highlights','articles'].includes(parts[1])));
    const flags = {
      'hide-right': settings.hideRightColumn,
      'hide-premium': settings.premium,
      'hide-follow': settings.follow,
      'hide-trends': settings.trends,
      'hide-grok': settings.floatingGrok,
      'hide-chat': settings.floatingMessages,
      'square-avatar': profileRoute && settings.profileSquareAvatar,
      'settings-shortcut': settings.settingsShortcut
    };
    for (const [name, value] of Object.entries(flags)) root.toggleAttribute('data-xtrim-' + name, !!(settings.enabled && value));
    const navRules = settings.enabled ? settings.hidden.map(item => {
      const escaped = CSS.escape(item);
      return `header[role="banner"] nav a[href="${escaped}"], header[role="banner"] [data-testid="${escaped}"] {display:none !important;}`;
    }).join('\n') : '';
    if (earlyNavStyle.textContent !== navRules) earlyNavStyle.textContent = navRules;
  }
  const earlyNavStyle = document.createElement('style');
  document.documentElement.append(earlyNavStyle);
  function apply() {
    updateEarlyPreferences();
    document.documentElement.toggleAttribute('data-xtrim-twitter', !!(settings.enabled && settings.twitterLogo));
    document.querySelectorAll('[data-xtrim-hidden]').forEach(el => el.removeAttribute('data-xtrim-hidden'));
    updateProfile();
    updateWidths();
    readMoreMenu();
    updateSettingsShortcut();
    updateAddedNavigation();
    if (!settings.enabled) return;
    hideFloatingDrawers();
    const hide = el => el && el.setAttribute('data-xtrim-hidden', '');
    const hideSidebarCard = el => {
      const sidebar = el.closest('[data-testid="sidebarColumn"]');
      if (!sidebar) { hide(el); return; }
      let wrapper = el;
      for (let parent = el.parentElement; parent && parent !== sidebar; parent = parent.parentElement) {
        // Stop before a shared wrapper containing other sidebar modules.
        if ([...parent.querySelectorAll('input, [role="search"], [data-testid="trend"], [data-testid="tweet"]')].some(other => !el.contains(other))) break;
        if ([...parent.querySelectorAll('aside, section')].some(other => other !== el && !el.contains(other) && !other.contains(el))) break;
        const css = getComputedStyle(parent);
        if (['Top', 'Right', 'Bottom', 'Left'].some(edge =>
          parseFloat(css['border' + edge + 'Width']) > 0 &&
          !['none', 'hidden'].includes(css['border' + edge + 'Style']))) {
          wrapper = parent;
          break;
        }
      }
      hide(wrapper);
    };
    if (settings.hideRightColumn) document.querySelectorAll('[data-testid="sidebarColumn"]').forEach(hide);
    document.querySelectorAll(navSelector).forEach(el => {
      if (settings.hidden.includes(key(el))) hide(el);
    });
    // Limit promotion matching to sidebar cards and explicit promotion components.
    // Never match arbitrary post text or paid creator subscription buttons.
    if (settings.premium) {
      document.querySelectorAll('[data-testid="premiumSignUp"], [data-testid="premiumSignup"]').forEach(hide);
      document.querySelectorAll('[data-testid="sidebarColumn"] aside, [data-testid="sidebarColumn"] section').forEach(el => {
        if (/subscribe to premium|upgrade to premium|try premium/i.test(el.getAttribute('aria-label') || el.textContent)) hideSidebarCard(el);
      });
      document.querySelectorAll('[data-testid="sidebarColumn"] a[href*="/i/premium"], [data-testid="sidebarColumn"] a[href*="/i/verified-choose"]').forEach(el => {
        const card = el.closest('aside, section');
        hideSidebarCard(card || el);
      });
    }
    if (settings.follow) {
      document.querySelectorAll('[data-testid="sidebarColumn"] aside, [data-testid="sidebarColumn"] section').forEach(el => {
        if (/who to follow/i.test(el.getAttribute('aria-label') || el.textContent)) hideSidebarCard(el);
      });
      document.querySelectorAll('h2').forEach(heading => {
        if (!/^who to follow$/i.test(heading.textContent.trim())) return;
        const section = heading.closest('aside, section');
        if (section && !section.querySelector('[data-testid="tweet"]')) hideSidebarCard(section);
        else {
          const cell = heading.closest('[data-testid="cellInnerDiv"]');
          if (cell) {
            hide(cell);
            let next = cell.nextElementSibling;
            while (next && next.querySelector('[data-testid="UserCell"]') && !next.querySelector('[data-testid="tweet"]')) {
              hide(next); next = next.nextElementSibling;
            }
            if (next && /show more/i.test(next.textContent) && next.querySelector('a[href*="/connect_people"]')) hide(next);
          }
        }
      });
    }
    if (settings.trends) {
      document.querySelectorAll('[data-testid="sidebarColumn"] section').forEach(section => {
        const heading = section.querySelector('h2');
        const isTrends = section.querySelector('[aria-label="Timeline: Trending now"]');
        if (isTrends || (heading && /^what[’']s happening$/i.test(heading.textContent.trim()))) {
          hideSidebarCard(section);
        }
      });
    }
    collapseSidebarWrappers();
  }
  window.addEventListener('resize', () => schedule());
  const schedule = () => { if (timer) return; timer = setTimeout(() => { timer = null; apply(); }, 16); };
  browser.storage.local.get(defaults).then(value => { settings = value; apply(); });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [name, change] of Object.entries(changes)) settings[name] = change.newValue ?? defaults[name];
    apply();
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  browser.runtime.onMessage.addListener(message => {
    if (message.type === 'navigation') return Promise.resolve(items());
    if (message.type === 'more-options') return Promise.resolve(readMoreMenu());
  });
})();
