(() => {
  // Site-wide look settings that work with any palette, including X's native themes.
  // Everything here is static CSS rebuilt only when settings change, except plain post
  // text, which rewrites text nodes and only looks at nodes X adds or changes.
  const defaults={enabled:true,themeMode:'default',themeCustom:{accent:'#1D9BF0'},siteFont:'default',textSize:100,density:'default',hideDividers:false,followColors:false,plainText:false,customCss:''};
  const keys=Object.keys(defaults);
  let settings=defaults;
  const sheet=document.createElement('style'),customSheet=document.createElement('style');
  document.documentElement.append(sheet,customSheet);
  const fonts={system:'system-ui, sans-serif',arial:'Arial, Helvetica, sans-serif',serif:'Georgia, serif',mono:'Menlo, Consolas, monospace'};
  const hex=value=>/^#[0-9a-f]{6}$/i.test(value)?value:null;
  function contrast(color) {
    const linear=offset=>{const c=parseInt(color.slice(offset,offset+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
    return .2126*linear(1)+.7152*linear(3)+.0722*linear(5)>.179?'#000000':'#FFFFFF';
  }
  function build() {
    let css='';
    const font=fonts[settings.siteFont];
    // Profile > Column font uses a more specific selector, so it still wins on profiles.
    if(font)css+=`html body,html body :is(div,span,a,button,input,textarea,h1,h2,h3,h4,h5,h6,p,li,label){font-family:${font} !important;}`;
    const size=Number(settings.textSize);
    if(Number.isFinite(size)&&size!==100) {
      // X puts its own Font size choice on <html> (15px by default) and sizes post text
      // to match, so 1rem follows that choice. Keep X's 15/20 line-height ratio.
      const scale=Math.max(80,Math.min(150,size))/100;
      css+=`[data-testid="tweetText"]{font-size:calc(1rem * ${scale}) !important;line-height:calc(1rem * ${(scale*4/3).toFixed(4)}) !important;}`;
    }
    const gap={compact:4,roomy:20}[settings.density];
    if(gap!==undefined) {
      // A post's 12px top gap is an empty spacer div; its 12px bottom gap is padding on
      // the content column (the one holding the author name), beside the avatar column.
      const post='article[data-testid="tweet"]>div>div';
      css+=`${post}>div:first-child:empty{height:${gap}px !important;}${post}>div>div:has([data-testid="User-Name"]){padding-bottom:${gap}px !important;}`;
    }
    // The divider is a bottom border on the timeline cell's first wrapper; the root
    // attribute outranks the custom theme's border color.
    if(settings.hideDividers)css+='html[data-xtrim-dividers] [data-testid="cellInnerDiv"]>div{border-bottom-color:transparent !important;}';
    if(settings.followColors) {
      const accent=(settings.themeMode==='custom'&&hex(settings.themeCustom?.accent))||'#1D9BF0';
      const text=contrast(accent);
      // Doubled attribute outranks the custom theme's role colors on the same nodes.
      const scope='html[data-xtrim-follow][data-xtrim-follow]';
      const follow=`${scope} :is([data-testid$="-follow"],[data-testid$="-subscribe"])`;
      const following=`${scope} [data-testid$="-unfollow"]`;
      css+=`${follow}{background-color:${accent} !important;border-color:${accent} !important;}${follow},${follow} *{color:${text} !important;}${follow}:hover,${follow}:focus-visible{background-color:color-mix(in srgb, ${accent} 85%, #000000) !important;}`;
      css+=`${following}:not(:hover):not(:focus-visible){border-color:color-mix(in srgb, ${accent} 60%, transparent) !important;}${following}:not(:hover):not(:focus-visible),${following}:not(:hover):not(:focus-visible) *{color:${accent} !important;}`;
    }
    return css;
  }
  // Pasted CSS stays local; @import is dropped so it cannot pull in remote stylesheets.
  const cleanCss=value=>typeof value==='string'?value.slice(0,50000).replace(/@import\b[^;]*;?/gi,''):'';

  // Mathematical bold/italic/script letters (U+1D400 block) plus the Letterlike Symbols
  // that fill its gaps. NFKC maps each of them to the plain letter or digit.
  const fancy=/[\u{1D400}-\u{1D7FF}ℂℊℋℌℍℎℐℑℒℕℙℚℛℜℝℤℨℬℭℯℰℱℳℴ]/u;
  const fancyAll=new RegExp(fancy.source,'gu');
  const postText='[data-testid="tweetText"]';
  const originals=new WeakMap();
  function plainNode(node) {
    const text=node.nodeValue;
    if(!text||!fancy.test(text))return;
    originals.set(node,text);
    node.nodeValue=text.replace(fancyAll,letter=>letter.normalize('NFKC'));
  }
  function plainTree(root) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())plainNode(walker.currentNode);
  }
  function restorePlainText() {
    document.querySelectorAll(postText).forEach(root=>{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node=walker.currentNode,original=originals.get(node);
        if(original!==undefined&&node.nodeValue===original.replace(fancyAll,letter=>letter.normalize('NFKC')))node.nodeValue=original;
        originals.delete(node);
      }
    });
  }
  const plainObserver=new MutationObserver(records=>{
    for(const record of records) {
      if(record.type==='characterData') {
        if(record.target.parentElement?.closest(postText))plainNode(record.target);
        continue;
      }
      for(const node of record.addedNodes) {
        if(node.nodeType===Node.TEXT_NODE) {
          if(node.parentElement?.closest(postText))plainNode(node);
        } else if(node.nodeType===Node.ELEMENT_NODE) {
          if(node.closest(postText))plainTree(node);
          else node.querySelectorAll(postText).forEach(plainTree);
        }
      }
    }
  });
  let plainActive=false;
  function syncPlainText(next) {
    if(next===plainActive)return;
    plainActive=next;
    if(next) {
      document.querySelectorAll(postText).forEach(plainTree);
      plainObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    } else {
      plainObserver.disconnect();
      restorePlainText();
    }
  }

  function apply() {
    const on=settings.enabled!==false;
    const css=on?build():'',custom=on?cleanCss(settings.customCss):'';
    if(sheet.textContent!==css)sheet.textContent=css;
    if(customSheet.textContent!==custom)customSheet.textContent=custom;
    document.documentElement.toggleAttribute('data-xtrim-follow',on&&settings.followColors===true);
    document.documentElement.toggleAttribute('data-xtrim-dividers',on&&settings.hideDividers===true);
    syncPlainText(on&&settings.plainText===true);
  }
  browser.storage.local.get(defaults).then(value=>{settings=value;apply();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!keys.some(key=>key in changes))return;
    settings={...settings};
    for(const key of keys)if(changes[key])settings[key]=changes[key].newValue??defaults[key];
    apply();
  });
})();
