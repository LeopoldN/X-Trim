// Read only X's existing metadata responses; forward every byte unchanged.
const mediaVariants=new Map(),mediaJobs=new Map();
let mediaCaptureEnabled=false;
browser.storage.local.get({enabled:true,mediaDownloads:true}).then(updateMediaCapture);
function updateMediaCapture(settings){mediaCaptureEnabled=settings.enabled&&settings.mediaDownloads;if(!mediaCaptureEnabled)mediaVariants.clear();}
browser.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&(changes.enabled||changes.mediaDownloads))browser.storage.local.get({enabled:true,mediaDownloads:true}).then(updateMediaCapture);
});
function rememberMedia(root,tabId){
  const stack=[root],found=new Map();
  while(stack.length){
    const value=stack.pop();if(!value||typeof value!=='object')continue;
    const variants=value.video_info?.variants;
    if(Array.isArray(variants)){
      const best=variants.filter(v=>{try{const u=new URL(v.url);return u.protocol==='https:'&&u.hostname==='video.twimg.com'&&!u.username&&!u.password&&!u.port&&u.pathname.endsWith('.mp4');}catch{return false;}}).sort((a,b)=>(b.bitrate||0)-(a.bitrate||0))[0];
      if(best){
        if(value.id_str)found.set(String(value.id_str),best.url);
        // Poster media IDs can differ from the enclosing tweet's ID.
        const match=(value.media_url_https||value.media_url||'').match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/);
        if(match)found.set(match[1],best.url);
      }
    }
    for(const child of Object.values(value))if(child&&typeof child==='object')stack.push(child);
  }
  if(!found.size||!mediaCaptureEnabled)return;
  const cache=mediaVariants.get(tabId)||new Map();
  for(const [id,url] of found){cache.delete(id);cache.set(id,url);}
  while(cache.size>100)cache.delete(cache.keys().next().value);
  mediaVariants.set(tabId,cache);
  browser.tabs.sendMessage(tabId,{type:'media-variants',variants:Object.fromEntries(cache)}).catch(()=>{});
}
browser.webRequest.onBeforeRequest.addListener(details=>{
  if((!mediaCaptureEnabled && !(typeof captureAccountHeaders!=='undefined'&&captureAccountHeaders)&&!(typeof blockStateEnabled!=='undefined'&&blockStateEnabled)&&!(typeof timelineDataEnabled!=='undefined'&&timelineDataEnabled))||details.tabId<0)return;
  let filter;try{filter=browser.webRequest.filterResponseData(details.requestId);}catch{return;}
  const chunks=[];let length=0,tooLarge=false;
  filter.ondata=event=>{
    filter.write(event.data);length+=event.data.byteLength;
    if(length>8*1024*1024){tooLarge=true;chunks.length=0;}
    if(!tooLarge)chunks.push(new Uint8Array(event.data));
  };
  filter.onstop=()=>{
    filter.close();if(tooLarge)return;
    try{const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const data=JSON.parse(new TextDecoder().decode(bytes));if(mediaCaptureEnabled)rememberMedia(data,details.tabId);if(typeof rememberAccountProfiles==='function')rememberAccountProfiles(data,details.tabId);if(typeof rememberBlockState==='function')rememberBlockState(data,details.tabId,details.url);if(typeof rememberTimelineData==='function')rememberTimelineData(data,details.tabId);}catch{}
  };
  filter.onerror=()=>{chunks.length=0;};
},{urls:['https://x.com/i/api/graphql/*','https://twitter.com/i/api/graphql/*','https://x.com/i/api/1.1/blocks/*.json*','https://twitter.com/i/api/1.1/blocks/*.json*'],types:['xmlhttprequest']},['blocking']);
browser.tabs.onRemoved.addListener(tabId=>{mediaVariants.delete(tabId);for(const [id,job] of mediaJobs)if(job.tabId===tabId&&!job.objectURL)mediaJobs.delete(id);});
async function downloadProgress(message,sender){
  const job=mediaJobs.get(message.id);
  if(!sender.tab||!job||job.tabId!==sender.tab.id)return {ok:false};
  try{
    const [item]=await browser.downloads.search({id:message.id});if(!item){mediaJobs.delete(message.id);return {ok:false};}
    if(item.state!=='in_progress'||Date.now()-job.created>86400000)mediaJobs.delete(message.id);
    if(item.state!=='in_progress'&&job.objectURL){URL.revokeObjectURL(job.objectURL);if(job.conversionTabId)browser.tabs.remove(job.conversionTabId).catch(()=>{});}
    return {ok:true,state:item.state,received:item.bytesReceived,total:item.totalBytes};
  }catch{return {ok:false};}
}
browser.runtime.onMessage.addListener((message,sender)=>{
  if(message.type==='media-variants-get'&&sender.tab)return Promise.resolve({variants:Object.fromEntries(mediaVariants.get(sender.tab.id)||[])});
});
browser.runtime.onMessage.addListener((message,sender)=>{
  if(message.type==='media-download-progress')return downloadProgress(message,sender);
  if(message.type!=='media-download')return;
  return (async()=>{
    try {
      const source=new URL(sender.url),url=new URL(message.url);
      if(!sender.tab||source.protocol!=='https:'||!['x.com','twitter.com'].includes(source.hostname)||url.protocol!=='https:'||url.username||url.password||url.port||!/^\d+$/.test(message.postId))return {ok:false};
      const video=url.hostname==='video.twimg.com'&&url.pathname.endsWith('.mp4');
      const image=url.hostname==='pbs.twimg.com'&&url.pathname.startsWith('/media/');
      if(!video&&!image)return {ok:false};
      if(!await hasDataConsent(MEDIA_DATA_TYPES))return {ok:false,error:'Open X Trim → Posts → Enable media downloads, then retry.'};
      let name=url.pathname.split('/').pop().replace(/[^a-z0-9._-]/gi,'_');
      if(image) {
        const format=(url.searchParams.get('format')||name.split('.').pop()).toLowerCase();
        if(!['jpg','jpeg','png','webp'].includes(format))return {ok:false};
        url.searchParams.set('name','orig');
        if(!/\.(jpg|jpeg|png|webp)$/i.test(name))name+='.'+format;
      }
      let downloadURL=url.href,objectURL,conversionTabId;
      if(message.asGif){
        if(!video||!url.pathname.startsWith('/tweet_video/'))return {ok:false,error:'Only X GIF videos can be converted.'};
        const token=typeof message.token==='string'?message.token.slice(0,100):'';
        const notify=(stage,percent)=>browser.tabs.sendMessage(sender.tab.id,{type:'media-gif-progress',token,stage,percent}).catch(()=>{});
        const converted=await startGifConversion(url.href,sender.tab.id,token);
        objectURL=converted.objectURL;conversionTabId=converted.conversionTabId;downloadURL=objectURL;name=name.replace(/\.mp4$/i,'.gif');
        notify('Choose save location…',null);
      }
      let id;
      try{id=await browser.downloads.download({url:downloadURL,filename:`x-${message.postId}-${name}`,saveAs:true});}
      catch(error){if(objectURL)URL.revokeObjectURL(objectURL);if(conversionTabId)browser.tabs.remove(conversionTabId).catch(()=>{});throw error;}
      mediaJobs.set(id,{tabId:sender.tab.id,created:Date.now(),objectURL,conversionTabId});
      return {ok:true,id};
    }catch(error){return {ok:false,error:error.message};}
  })();
});

// Release generated files even if the initiating post is no longer open.
browser.downloads.onChanged.addListener(delta=>{
  if(delta.state&&delta.state.current!=='in_progress'){
    const job=mediaJobs.get(delta.id);if(job?.objectURL){URL.revokeObjectURL(job.objectURL);delete job.objectURL;if(job.conversionTabId)browser.tabs.remove(job.conversionTabId).catch(()=>{});}
  }
});
