(() => {
  const preset = {
    dark:{background:'#000000',surface:'#16181C',text:'#E7E9EA',muted:'#71767B',border:'#2F3336',accent:'#1D9BF0'},
    light:{background:'#FFFFFF',surface:'#F7F9F9',text:'#0F1419',muted:'#536471',border:'#EFF3F4',accent:'#1D9BF0'}
  };
  let preferences={enabled:true,themeMode:'default',themeCustom:preset.dark},active=false;
  const sheet=document.createElement('style');document.documentElement.append(sheet);
  const metaOriginals=new Map();
  // X's chat drawer renders inside an open shadow root that redeclares its own --x-* palette,
  // so page-level rules cannot reach it; a style element inside each root carries the theme.
  const shadowHosts='[data-testid="xchatEmbedDrawer"],[data-testid="xchatEmbedOverlays"]';
  const shadowSheets=new WeakMap();
  function syncShadows(css) {
    document.querySelectorAll(shadowHosts).forEach(host=>{
      const root=host.shadowRoot;
      if(!root)return;
      let style=shadowSheets.get(root);
      if(!style){if(!css)return;style=document.createElement('style');shadowSheets.set(root,style);}
      if(style.parentNode!==root)root.append(style);
      if(style.textContent!==css)style.textContent=css;
    });
  }
  const base=new Set(['0,0,0','255,255,255','21,32,43']);
  const surfaces=new Set(['15,20,25','22,24,28','32,35,39','247,249,249','239,243,244','25,39,52','30,39,50','21,32,43']);
  const primary=new Set(['231,233,234','239,243,244','255,255,255','15,20,25','20,23,26']);
  const secondary=new Set(['113,118,123','83,100,113','101,119,134','139,152,165','136,153,166']);
  const borders=new Set(['47,51,54','51,54,57','56,68,77','239,243,244','207,217,222','83,100,113']);
  const creatorMuted=new Set(['75,85,99','156,163,175','115,115,115','163,163,163']);
  const inCreatorStudio=element=>/^\/i\/jf\/creators\/studio\/?$/.test(location.pathname)&&!!element.closest('.jf-element');
  function rgb(value) {const m=value.match(/^rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\)$/);return m&&(!m[4]||Number(m[4])===1)?m.slice(1,4).map(Number).join(','):null;}
  function tag(element) {
    if(element instanceof SVGElement) {
      if(element.closest('[data-testid="icon-verified"],a[aria-label="X"],a[aria-label="Twitter"],.xtrim-download,[data-xtrim-about],[data-testid="tweetPhoto"],[data-testid="videoPlayer"]'))return;
      const css=getComputedStyle(element),color=rgb(css.color),fill=rgb(css.fill);
      if(inCreatorStudio(element)) {
        element.setAttribute('data-xtrim-theme-icon','');
        if(fill)element.setAttribute('data-xtrim-theme-icon-fill','');
        else element.removeAttribute('data-xtrim-theme-icon-fill');
        return;
      }
      if(primary.has(color)||secondary.has(color)||primary.has(fill)||secondary.has(fill)||color==='29,155,240')element.setAttribute('data-xtrim-theme-icon','');
      // A fill of none defines an outline, including child paths in the Settings gear.
      // Only recolor actual solid fills; stroke=currentColor follows the icon color naturally.
      if(fill&&(primary.has(fill)||secondary.has(fill)||fill==='29,155,240'))element.setAttribute('data-xtrim-theme-icon-fill','');
      else element.removeAttribute('data-xtrim-theme-icon-fill');
      return;
    }
    if (!(element instanceof HTMLElement) || element===sheet || element.closest('.xtrim-download,svg,video,canvas,[data-testid="tweetPhoto"],[data-testid="videoPlayer"]')) return;
    const postButton=element.closest('[data-testid="SideNav_NewTweet_Button"],[data-testid="tweetButton"],[data-testid="tweetButtonInline"]');
    if(postButton) {
      // Keep the native button fill and use a separate contrasting foreground.
      for(const role of ['bg','text','border'])element.removeAttribute('data-xtrim-theme-'+role);
      const fill=rgb(getComputedStyle(postButton).backgroundColor);
      if(fill) {
        const channels=fill.split(',').map(value=>{const c=Number(value)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
        const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
        postButton.setAttribute('data-xtrim-post-contrast',luminance>.179?'dark':'light');
      }
      return;
    }
    // Already tagged properties retain their original semantic roles across palette switches.
    const css=getComputedStyle(element),bg=rgb(css.backgroundColor),color=rgb(css.color);
    if(inCreatorStudio(element)&&!element.hasAttribute('data-xtrim-theme-text')) {
      if(color==='0,0,0')element.setAttribute('data-xtrim-theme-text','text');
      else if(creatorMuted.has(color))element.setAttribute('data-xtrim-theme-text','muted');
    }
    if (!element.hasAttribute('data-xtrim-theme-bg') && css.backgroundImage==='none') {
      if(base.has(bg))element.setAttribute('data-xtrim-theme-bg','background');
      else if(surfaces.has(bg))element.setAttribute('data-xtrim-theme-bg','surface');
      else if(bg==='29,155,240'||bg==='29,161,242')element.setAttribute('data-xtrim-theme-bg','accent');
    }
    if(!element.hasAttribute('data-xtrim-theme-text')) {
      if(primary.has(color))element.setAttribute('data-xtrim-theme-text','text');
      else if(secondary.has(color))element.setAttribute('data-xtrim-theme-text','muted');
      else if(color==='29,155,240'||color==='29,161,242')element.setAttribute('data-xtrim-theme-text','accent');
    }
    if(!element.hasAttribute('data-xtrim-theme-border') && ['Top','Right','Bottom','Left'].some(edge=>parseFloat(css['border'+edge+'Width'])>0 && borders.has(rgb(css['border'+edge+'Color']))))element.setAttribute('data-xtrim-theme-border','border');
  }
  function scan(root) {if(root instanceof HTMLElement)tag(root);root.querySelectorAll?.('*').forEach(tag);}
  function syncMeta(palette) {
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>{
      if(!metaOriginals.has(meta))metaOriginals.set(meta,meta.getAttribute('content'));
      if(meta.getAttribute('content')!==palette.background)meta.setAttribute('content',palette.background);
    });
  }
  function selectNativeTheme() {
    if (!preferences.enabled || !['dark','light'].includes(preferences.themeMode)) return;
    const value=preferences.themeMode==='dark'?'2':'0';
    const current=document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('night_mode='))?.slice('night_mode='.length);
    if(current===value)return;
    const domain=location.hostname==='twitter.com'||location.hostname.endsWith('.twitter.com')?'.twitter.com':'.x.com';
    document.cookie=`night_mode=${value}; Path=/; Domain=${domain}; Max-Age=31536000; Secure; SameSite=Lax`;
    // Verify that cookies are writable before reloading, avoiding a reload loop if blocked.
    if(document.cookie.split(';').some(part=>part.trim()===`night_mode=${value}`))location.reload();
  }
  let underlyingPath='/home';
  function apply() {
    const composing=/^\/compose(?:\/|$)/.test(location.pathname);
    if(!composing)underlyingPath=location.pathname;
    const pagePath=composing?underlyingPath:location.pathname;
    const palette=preferences.themeMode==='custom'?Object.fromEntries(Object.keys(preset.dark).map(key=>[key,/^#[a-f0-9]{6}$/i.test(preferences.themeCustom?.[key])?preferences.themeCustom[key]:preset.dark[key]])):null;
    const next=!!(preferences.enabled&&palette);
    if(!next) {
      active=false;document.documentElement.removeAttribute('data-xtrim-theme');if(sheet.textContent)sheet.textContent='';
      for(const [meta,content]of metaOriginals){if(content===null)meta.removeAttribute('content');else meta.setAttribute('content',content);}metaOriginals.clear();syncShadows('');selectNativeTheme();return;
    }
    // Remove our palette while classifying native X colors, including nodes added later.
    document.documentElement.removeAttribute('data-xtrim-theme');
    scan(document);
    document.querySelectorAll('[data-xtrim-grok-page]').forEach(node=>node.removeAttribute('data-xtrim-grok-page'));
    if(/^\/i\/grok(?:\/|$)/.test(pagePath)) {
      const column=document.querySelector?.('[data-testid="primaryColumn"]');
      if(column)column.setAttribute('data-xtrim-grok-page','');
    }
    document.querySelectorAll('[data-xtrim-post-header]').forEach(node=>node.removeAttribute('data-xtrim-post-header'));
    // The Lists overview uses a search bar instead of a heading in its sticky header.
    const listsTimeline=document.querySelector?.('[aria-label="Lists timeline"]');
    if(listsTimeline?.querySelector('form[aria-label="Search Lists"]')) {
      const back=listsTimeline.querySelector('[data-testid="app-bar-back"]');
      for(let node=back?.parentElement;node&&node!==listsTimeline;node=node.parentElement) {
        node.setAttribute('data-xtrim-post-header','');
        if(getComputedStyle(node).position==='sticky')break;
      }
    }
    const profileHeader=/^\/[a-z0-9_]{1,15}(?:\/(?:with_replies|media|likes|highlights|articles))?\/?$/i.test(pagePath)&&!!document.querySelector?.('[data-testid="primaryColumn"] [data-testid="UserName"]');
    const aboutHeader=/^\/[a-z0-9_]{1,15}\/about\/?$/i.test(pagePath);
    const notificationsHeader=/^\/notifications(?:\/mentions)?\/?$/.test(pagePath);
    const historyHeader=/^\/i\/history(?:\/likes)?\/?$/.test(pagePath);
    const communitiesHeader=/^\/(?:i|[a-z0-9_]{1,15})\/communities(?:\/explore)?\/?$/i.test(pagePath);
    document.querySelectorAll('[data-xtrim-account-section]').forEach(node=>node.removeAttribute('data-xtrim-account-section'));
    if(/^\/settings(?:\/|$)/.test(pagePath)) {
      // Settings has two independently labelled sections instead of a primaryColumn.
      // Their first child contains only the header; the search and settings rows
      // are siblings and must keep their normal background colors.
      document.querySelectorAll('section[aria-labelledby="root-header"],section[aria-labelledby="detail-header"]').forEach(section=>{
        section.setAttribute('data-xtrim-account-section','');
        // The password confirmation header has no id, despite its section's label.
        const heading=section.firstElementChild?.querySelector('h2[role="heading"]');
        for(let node=heading?.parentElement;node&&node!==section;node=node.parentElement) {
          node.setAttribute('data-xtrim-post-header','');
        }
      });
    }
    if(/\/status\/\d+/.test(pagePath)||profileHeader||aboutHeader||notificationsHeader||historyHeader||communitiesHeader) {
      const column=document.querySelector?.('[data-testid="primaryColumn"]');
      const back=column?.querySelector('button[aria-label="Back"],[role="button"][aria-label="Back"]');
      const heading=(notificationsHeader||historyHeader||communitiesHeader)?column?.querySelector('h2[role="heading"]'):null;
      for(let node=(back||heading)?.parentElement;node&&node!==column;node=node.parentElement) {
        if(node.querySelector('article'))break;
        if(node.querySelector('h2,[role="heading"]'))node.setAttribute('data-xtrim-post-header','');
        if(getComputedStyle(node).position==='sticky'){node.setAttribute('data-xtrim-post-header','');break;}
      }
    }
    document.querySelectorAll('[data-xtrim-feed-tabs]').forEach(node=>node.removeAttribute('data-xtrim-feed-tabs'));
    document.querySelectorAll('[data-xtrim-feed-tab-chrome]').forEach(node=>node.removeAttribute('data-xtrim-feed-tab-chrome'));
    if(/^\/home\/?$/.test(pagePath)||/^\/i\/lists\/\d+\/?$/.test(pagePath)||notificationsHeader||historyHeader||communitiesHeader) {
      const tabsSelector=communitiesHeader?'[data-testid="primaryColumn"] nav[aria-label="My Communities"] [role="tablist"]':historyHeader?'[data-testid="primaryColumn"] nav[aria-label="History timelines"] [role="tablist"]':'[data-testid="primaryColumn"] [role="tablist"]';
      document.querySelectorAll(tabsSelector).forEach(list=>{
        if(list.closest('[data-testid="toolBar"]'))return;
        list.setAttribute('data-xtrim-feed-tabs','');
        const nav=list.closest('nav');
        if(nav)(nav.parentElement||nav).setAttribute('data-xtrim-feed-tab-chrome','');
        // X's selected-tab indicator is a short, rounded, blue background div.
        list.querySelectorAll('[role="tab"] [data-xtrim-theme-bg="accent"]').forEach(node=>node.setAttribute('data-xtrim-tab-indicator',''));
      });
    }
    const channel=hex=>parseInt(hex,16)/255;
    const luminance=0.2126*channel(palette.background.slice(1,3))+0.7152*channel(palette.background.slice(3,5))+0.0722*channel(palette.background.slice(5,7));
    let css=`html[data-xtrim-theme]{color-scheme:${luminance>.5?'light':'dark'} !important;background-color:${palette.background} !important;}html[data-xtrim-theme] body{background-color:${palette.background} !important;color:${palette.text} !important;}`;
    // Keep the composer backdrop subtle instead of X's 50% pale gray wash.
    if(composing)css+='html[data-xtrim-theme] #layers [data-testid="mask"]{background-color:rgba(0,0,0,.12) !important;backdrop-filter:none !important;}';
    if(composing) {
      const composerSelector='#layers [role="dialog"][aria-modal="true"]:has([data-testid="tweetTextarea_0"])';
      const column=document.querySelector?.('[data-testid="primaryColumn"]');
      const composer=document.querySelector?.(composerSelector);
      const columnRect=column?.getBoundingClientRect();
      const composerRect=composer?.getBoundingClientRect();
      // X centers the modal in the viewport. Shift that center to the timeline,
      // clamping it so the composer remains reachable on narrow screens.
      const viewport=document.documentElement.clientWidth;
      let offset=0;
      if(columnRect&&composerRect&&viewport>700) {
        const half=composerRect.width/2;
        const center=Math.max(half+8,Math.min(viewport-half-8,columnRect.left+columnRect.width/2));
        offset=center-viewport/2;
      }
      css+=`html[data-xtrim-theme] ${composerSelector}{outline:2px solid ${palette.accent} !important;outline-offset:0;translate:${offset}px 0 !important;}`;
    }
    for(const [key,value]of Object.entries(palette)) {
      css+=`html[data-xtrim-theme] [data-xtrim-theme-bg="${key}"]{background-color:${value} !important;}html[data-xtrim-theme] [data-xtrim-theme-text="${key}"]{color:${value} !important;}`;
    }
    css+=`html[data-xtrim-theme] [data-xtrim-theme-border]{border-color:${palette.border} !important;}`;
    css+=`html[data-xtrim-theme] [data-xtrim-post-contrast="dark"],html[data-xtrim-theme] [data-xtrim-post-contrast="dark"] *{color:#000000 !important;}html[data-xtrim-theme] [data-xtrim-post-contrast="light"],html[data-xtrim-theme] [data-xtrim-post-contrast="light"] *{color:#FFFFFF !important;}`;
    const customColor=(key,fallback)=>/^#[a-f0-9]{6}$/i.test(preferences.themeCustom?.[key])?preferences.themeCustom[key]:fallback;
    const icons=customColor('icons',palette.text),buttonBackground=customColor('buttonBackground',palette.accent);
    const linear=value=>{const c=parseInt(value,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
    const buttonLuminance=.2126*linear(buttonBackground.slice(1,3))+.7152*linear(buttonBackground.slice(3,5))+.0722*linear(buttonBackground.slice(5,7));
    const buttonText=preferences.themeCustom?.buttonAutoContrast===false?customColor('buttonText','#FFFFFF'):(buttonLuminance>.179?'#000000':'#FFFFFF');
    css+=`html[data-xtrim-theme] [data-xtrim-theme-icon]{color:${icons} !important;}html[data-xtrim-theme] [data-xtrim-theme-icon-fill]{fill:currentColor !important;}`;
    if(preferences.themeCustom?.engagementColors===true) {
      const engagement='html[data-xtrim-theme] :is([data-testid="like"],[data-testid="unlike"],[data-testid="retweet"],[data-testid="unretweet"])';
      const selected='html[data-xtrim-theme] :is([data-testid="unlike"],[data-testid="unretweet"])';
      css+=`${engagement},${engagement} *{color:${icons} !important;}${engagement} svg{fill:currentColor !important;}${selected},${selected} *,${engagement}:hover,${engagement}:hover *,${engagement}:focus-visible,${engagement}:focus-visible *{color:${palette.accent} !important;}${engagement}:is(:hover,:focus-visible) svg{background-color:color-mix(in srgb, ${palette.accent} 12%, transparent) !important;border-radius:50%;}`;
    }
    const floatingSelector=['GrokDrawerHeader','chat-drawer-main'].map(id=>`html[data-xtrim-theme] [data-testid="${id}"]`);
    const grok='html[data-xtrim-theme] :is([data-testid="GrokDrawer"],[data-xtrim-grok-page],[data-testid="chat-drawer-root"],[data-testid="xchatEmbedDrawer"],[data-testid="xchatEmbedOverlays"])';
    const grokHover=`color-mix(in srgb, ${palette.text} 8%, ${palette.background})`;
    const grokVars={
      '--x-fg-primary':palette.text,'--x-fg-secondary':palette.muted,'--x-fg-tertiary':palette.muted,
      '--x-fg-brand':palette.accent,'--x-fg-inverted':palette.background,
      '--x-bg-primary':palette.background,'--x-bg-secondary':palette.surface,'--x-bg-tertiary':palette.surface,
      '--x-bg-inputs':palette.surface,'--x-bg-modal':palette.surface,
      '--x-border-normal':palette.border,'--x-border-elevated':palette.border,'--x-border-active':palette.accent,
      '--x-btn-ghost-hover':grokHover,'--x-btn-ghost-pressed':palette.surface,
      '--x-btn-primary':buttonBackground,'--x-btn-secondary':palette.surface
    };
    css+=`${grok},${grok} *{${Object.entries(grokVars).map(([key,value])=>`${key}:${value} !important;`).join('')}}`;
    const shadowVars=Object.entries(grokVars).map(([key,value])=>`${key}:${value} !important;`).join('');
    const shadowCss=`:host,*{${shadowVars}color-scheme:${luminance>.5?'light':'dark'} !important;}.text-primary{color:${palette.text} !important;}.text-secondary,.text-muted-foreground{color:${palette.muted} !important;}[contenteditable="true"]{color:${palette.text} !important;caret-color:${palette.accent} !important;}svg{color:${icons} !important;}`;
    css+=`${grok}{background:${palette.background} !important;color:${palette.text} !important;border-color:${palette.border} !important;}${grok} .text-primary{color:${palette.text} !important;}${grok} .text-secondary,${grok} .text-muted-foreground{color:${palette.muted} !important;}${grok} [contenteditable="true"]{color:${palette.text} !important;caret-color:${palette.accent} !important;}${grok} [data-testid="GrokDrawerHeader"]{background:${customColor('tabBackground',palette.background)} !important;}${grok} [data-testid="GrokDrawerHeader"] div{background-color:transparent !important;}${grok} [data-testid="GrokDrawerHeader"] button:hover{background-color:${grokHover} !important;}${grok} svg{color:${icons} !important;}`;
    // Floating controls use translucent/glass fills which the opaque neutral-color mapper skips.
    css+=`${floatingSelector.join(',')}{background:${palette.surface} !important;border-color:${palette.border} !important;color:${icons} !important;box-shadow:0 2px 12px rgba(0,0,0,.18) !important;backdrop-filter:none !important;}${floatingSelector.map(selector=>selector+' svg').join(',')}{color:${icons} !important;fill:currentColor !important;}${floatingSelector.map(selector=>selector+' svg path:not([fill="none"])').join(',')}{color:${icons} !important;fill:currentColor !important;}`;
    const postSelector=['SideNav_NewTweet_Button','tweetButton','tweetButtonInline'].map(id=>`html[data-xtrim-theme] [data-testid="${id}"]`);
    css+=`${postSelector.join(',')}{background-color:${buttonBackground} !important;background-image:none !important;}${postSelector.flatMap(selector=>[selector,selector+' *']).join(',')}{color:${buttonText} !important;}`;
    css+=`html[data-xtrim-theme] [data-xtrim-post-header]{background:${customColor('tabBackground',palette.background)} !important;backdrop-filter:none !important;}html[data-xtrim-theme] [data-xtrim-post-header] [data-xtrim-theme-bg]{background-color:transparent !important;}`;
    // Native light-mode hover fills otherwise flash white against a custom dark palette.
    const accountRow='html[data-xtrim-theme] [data-xtrim-account-section] a[role="tab"]';
    const accountHover=`color-mix(in srgb, ${palette.text} 8%, ${palette.background})`;
    css+=`${accountRow}{transition:background-color .2s ease;}${accountRow}:hover,${accountRow}:focus-visible{background-color:${accountHover} !important;}${accountRow}:hover [data-xtrim-theme-bg],${accountRow}:focus-visible [data-xtrim-theme-bg]{background-color:transparent !important;}@media(prefers-reduced-motion:reduce){${accountRow}{transition:none !important;}}`;
    const manage='html[data-xtrim-theme] [data-testid="primaryColumn"] button[aria-label="Manage timelines"]';
    const manageWrapper='html[data-xtrim-theme] [data-testid="primaryColumn"] div:has(> button[aria-label="Manage timelines"])';
    css+=`${manageWrapper},${manage}{background:${customColor('tabBackground',palette.background)} !important;box-shadow:none !important;}${manage} *{background-color:transparent !important;background-image:none !important;color:${icons} !important;}${manage} svg{fill:currentColor !important;}`;
    const tabBar='html[data-xtrim-theme] [data-xtrim-feed-tabs]';
    const chrome='html[data-xtrim-theme] [data-xtrim-feed-tab-chrome]';
    css+=`${chrome},${chrome} button,${chrome} [data-xtrim-theme-bg]:not([data-xtrim-tab-indicator]){background-color:${customColor('tabBackground',palette.background)} !important;background-image:none !important;}${chrome} button{color:${icons} !important;box-shadow:none !important;}`;

    css+=`${tabBar}{background-color:${customColor('tabBackground',palette.background)} !important;background-image:none !important;}${tabBar} [data-xtrim-theme-bg]:not([data-xtrim-tab-indicator]){background-color:transparent !important;}${tabBar} [role="tab"],${tabBar} [role="tab"] [data-xtrim-theme-text]{color:${customColor('tabText',palette.muted)} !important;}${tabBar} [role="tab"][aria-selected="true"],${tabBar} [role="tab"][aria-selected="true"] [data-xtrim-theme-text]{color:${customColor('tabActive',palette.text)} !important;}${tabBar} [data-xtrim-tab-indicator]{background-color:${customColor('tabIndicator',palette.accent)} !important;}`;
    if(preferences.themeCustom?.gradient===true) {
      const end=/^#[a-f0-9]{6}$/i.test(preferences.themeCustom.gradientEnd)?preferences.themeCustom.gradientEnd:'#15202B';
      const rawAngle=Number(preferences.themeCustom.gradientAngle??135);
      const angle=Number.isFinite(rawAngle)?Math.max(0,Math.min(360,rawAngle)):135;
      // One viewport-wide gradient; neutral page layers reveal it instead of restarting it per card.
      css+=`html[data-xtrim-theme]{background-image:linear-gradient(${angle}deg,${palette.background},${end}) !important;background-attachment:fixed !important;min-height:100%;}html[data-xtrim-theme] body,html[data-xtrim-theme] [data-xtrim-theme-bg="background"]{background-color:transparent !important;}`;
    }
    if(sheet.textContent!==css)sheet.textContent=css;
    document.documentElement.setAttribute('data-xtrim-theme',preferences.themeMode);active=true;syncMeta(palette);syncShadows(shadowCss);
  }
  const defaults={enabled:true,themeMode:'default',themeCustom:preset.dark};
  browser.storage.local.get(defaults).then(value=>{preferences=value;apply();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!['enabled','themeMode','themeCustom'].some(key=>key in changes))return;
    for(const key of ['enabled','themeMode','themeCustom'])if(changes[key])preferences[key]=changes[key].newValue??defaults[key];apply();
  });
  let queued=false;
  globalThis.addEventListener?.('resize',()=>{
    if(!active||queued)return;
    queued=true;requestAnimationFrame(()=>{queued=false;apply();});
  });
  new MutationObserver(records=>{
    if(!active||queued||!records.some(record=>record.type==='attributes'||[...record.addedNodes].some(node=>node.nodeType===1)))return;
    queued=true;requestAnimationFrame(()=>{queued=false;apply();});
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','data-theme']});
})();
