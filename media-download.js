(() => {
  let preferences={enabled:true,mediaDownloads:true},queued=false;
  function bindDownload(button,url,postId) {
    button.onclick=async event=>{
      event.preventDefault();event.stopPropagation();if(button.disabled)return;
      button.disabled=true;button.textContent='Downloading…';
      try {
        const result=await browser.runtime.sendMessage({type:'media-download',url,postId});
        button.textContent=result?.ok?'Download started':'Try download again';
        button.title=result?.ok?'Check your browser downloads.':'Download failed or was cancelled.';
      }catch{button.textContent='Try download again';}
      finally{button.disabled=false;}
    };
  }
  function render() {
    const route=location.pathname.match(/^\/([a-z0-9_]{1,15})\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/i);
    const targets=new Set();
    if(preferences.enabled&&preferences.mediaDownloads&&route) {
      const path=`/${route[1]}/status/${route[2]}`.toLowerCase();
      for(const tweet of document.querySelectorAll('article[data-testid="tweet"]')) {
        const matches=[...tweet.querySelectorAll('a[href*="/status/"]')].some(link=>new URL(link.href).pathname.toLowerCase().replace(/\/(?:photo|video)\/\d+\/?$/,'')===path&&link.closest('article[data-testid="tweet"]')===tweet);
        if(!matches)continue;
        for(const photo of tweet.querySelectorAll('[data-testid="tweetPhoto"]')) {
          if(photo.closest('article[data-testid="tweet"]')!==tweet)continue;
          const image=photo.querySelector('img');if(!image)continue;
          let url;try{url=new URL(image.currentSrc||image.src);}catch{continue;}
          if(url.protocol!=='https:'||url.hostname!=='pbs.twimg.com'||!url.pathname.startsWith('/media/'))continue;
          url.searchParams.set('name','orig');
          targets.add(photo);
          let button=photo.querySelector('[data-xtrim-download]');
          if(!button){button=document.createElement('button');button.type='button';button.className='xtrim-download';button.setAttribute('data-xtrim-download','');button.textContent='Download image';button.title='Save original-resolution image';photo.append(button);}
          bindDownload(button,url.href,route[2]);
        }
        for(const video of tweet.querySelectorAll('video')) {
          if(video.closest('article[data-testid="tweet"]')!==tweet)continue;
          // currentSrc may be a blob while a usable MP4 remains in src/source.
          const candidates=[video.currentSrc,video.src,...[...video.querySelectorAll('source')].map(source=>source.src)];
          let url=null;
          for(const raw of candidates) {
            try{const candidate=new URL(raw);if(candidate.protocol==='https:'&&candidate.hostname==='video.twimg.com'&&candidate.pathname.endsWith('.mp4')){url=candidate;break;}}catch{}
          }
          const host=video.closest('[data-testid="videoPlayer"]')||video.parentElement;
          targets.add(host);
          let button=host.querySelector('[data-xtrim-download]');
          if(!button) {
            button=document.createElement('button');button.type='button';button.className='xtrim-download';button.setAttribute('data-xtrim-download','');button.textContent='Download';
            host.append(button);
          }
          if(!url) {
            button.disabled=true;
            if(button.textContent!=='Stream download unavailable')button.textContent='Stream download unavailable';
            button.title='This video uses streaming rather than a direct MP4. GIF/direct MP4 downloads are supported.';
            continue;
          }
          if(button.textContent==='Stream download unavailable'){button.disabled=false;button.textContent='Download';button.title='Download MP4';}
          bindDownload(button,url.href,route[2]);
        }
      }
    }
    document.querySelectorAll('[data-xtrim-download]').forEach(button=>{if(!targets.has(button.parentElement))button.remove();});
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
  browser.storage.local.get(preferences).then(value=>{preferences=value;schedule();});
  browser.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;for(const key of ['enabled','mediaDownloads'])if(changes[key])preferences[key]=changes[key].newValue??true;schedule();});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  document.addEventListener('loadedmetadata',schedule,true);window.addEventListener('popstate',schedule);
})();
