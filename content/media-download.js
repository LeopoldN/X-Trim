(() => {
  let preferences={enabled:true,mediaDownloads:true},queued=false;
  let variants={};
  const gifButtons=new Map();
  browser.runtime.onMessage.addListener(message=>{
    if(message.type!=='media-gif-progress')return;
    const button=gifButtons.get(message.token);if(!button)return;
    button.textContent=message.stage+(message.percent===null?'':` ${message.percent}%`);
    if(message.percent===null)button.dataset.indeterminate='true';
    else{delete button.dataset.indeterminate;button.style.setProperty('--download-progress',message.percent+'%');}
  });
  browser.runtime.onMessage.addListener(message=>{if(message.type==='media-variants'){variants=message.variants;schedule();}});
  browser.runtime.sendMessage({type:'media-variants-get'}).then(result=>{variants=result?.variants||{};schedule();}).catch(()=>{});
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function bindDownload(button,url,postId,asGif=false) {
    button.onclick=async event=>{
      event.preventDefault();event.stopPropagation();if(button.disabled)return;
      delete button.dataset.error;button.disabled=true;button.dataset.busy='true';button.dataset.indeterminate='true';
      button.textContent='Choose save location…';button.setAttribute('aria-busy','true');
      const token=crypto.randomUUID();if(asGif)gifButtons.set(token,button);
      button.style.setProperty('--download-progress','0%');
      try {
        const result=await browser.runtime.sendMessage({type:'media-download',url,postId,asGif,token});
        if(!result?.ok)throw new Error(result?.error||'Download failed or was cancelled.');
        button.textContent='Downloading…';
        while(button.isConnected){
          const progress=await browser.runtime.sendMessage({type:'media-download-progress',id:result.id});
          if(!progress?.ok)throw new Error('Progress unavailable. Check Firefox downloads.');
          if(progress.state==='interrupted')throw new Error('Download interrupted or cancelled.');
          if(progress.state==='complete'){
            delete button.dataset.indeterminate;button.style.setProperty('--download-progress','100%');button.textContent='Downloaded';button.title='Saved successfully.';break;
          }
          if(progress.total>0){
            delete button.dataset.indeterminate;
            const percent=Math.min(99,Math.floor(progress.received/progress.total*100));
            button.style.setProperty('--download-progress',percent+'%');button.textContent=`Downloading ${percent}%`;
          }
          await pause(400);
        }
      }catch(error){button.dataset.error='true';button.textContent='Retry: '+error.message;button.title=error.message;button.style.setProperty('--download-progress','0%');}
      finally{gifButtons.delete(token);button.disabled=false;delete button.dataset.busy;delete button.dataset.indeterminate;button.removeAttribute('aria-busy');}
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
          const mediaId=(video.poster||'').match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/)?.[1];
          const candidates=[variants[mediaId],video.currentSrc,video.src,...[...video.querySelectorAll('source')].map(source=>source.src)];
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
          if(button.dataset.busy)continue;
          if(!url) {
            button.disabled=true;
            if(button.textContent!=='Play or reload to find video')button.textContent='Play or reload to find video';
            button.title='Play the video or reload this post so X Trim can read its metadata. Videos without an MP4 variant are not supported.';
            continue;
          }
          if(button.textContent==='Play or reload to find video'){button.disabled=false;button.textContent='Download';button.title='Download MP4';}
          const asGif=url.pathname.startsWith('/tweet_video/');
          if(!button.dataset.error&&!['Downloaded','Try download again'].includes(button.textContent))button.textContent=asGif?'Download GIF':'Download';
          if(!button.dataset.error)button.title=asGif?'Convert locally to a looping GIF (up to 480px, 12 fps)':'Download MP4';
          bindDownload(button,url.href,route[2],asGif);
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
