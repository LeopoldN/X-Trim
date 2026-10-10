// Local MP4-to-GIF conversion. gif.js 0.2.0 is bundled, never fetched at runtime.
let gifConversionBusy=false;
function gifMediaEvent(video,event,action){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error('Video decoding timed out.')),15000);
    const ready=()=>finish(),failed=()=>finish(new Error('Firefox could not decode this GIF video.'));
    function finish(error){clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener('error',failed);error?reject(error):resolve();}
    video.addEventListener(event,ready,{once:true});video.addEventListener('error',failed,{once:true});
    try{action();}catch(error){finish(error);}
  });
}
async function convertTwitterGif(url,notify){
  if(gifConversionBusy)throw new Error('Another GIF is converting. Try again when it finishes.');
  gifConversionBusy=true;
  let inputURL,encoder,video;
  try{
    notify('Fetching GIF…',null);
    const response=await fetch(url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw new Error('Could not fetch GIF video.');
    const limit=32*1024*1024,total=Number(response.headers.get('content-length'));
    if(total>limit)throw new Error('GIF source exceeds the 32 MB conversion limit.');
    const reader=response.body.getReader(),parts=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('GIF source exceeds the 32 MB conversion limit.');parts.push(value);notify('Fetching GIF',total>0?Math.min(99,Math.floor(size/total*100)):null);}}
    finally{await reader.cancel().catch(()=>{});}
    inputURL=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));
    video=document.createElement('video');video.muted=true;video.preload='auto';
    await gifMediaEvent(video,'loadeddata',()=>{video.src=inputURL;video.load();});
    if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>30)throw new Error('GIF conversion supports clips up to 30 seconds.');
    if(!video.videoWidth||!video.videoHeight)throw new Error('Invalid video dimensions.');
    const frames=Math.ceil(video.duration*12);
    const scale=Math.min(1,480/Math.max(video.videoWidth,video.videoHeight),Math.sqrt(24000000/(frames*video.videoWidth*video.videoHeight)));
    const width=Math.max(1,Math.round(video.videoWidth*scale)),height=Math.max(1,Math.round(video.videoHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    encoder=new GIF({workers:2,quality:10,width,height,repeat:0,workerScript:browser.runtime.getURL('vendor/gif.js/dist/gif.worker.js')});
    for(let frame=0;frame<frames;frame++){
      const time=frame/12;
      if(Math.abs(video.currentTime-time)>.0001)await gifMediaEvent(video,'seeked',()=>{video.currentTime=time;});
      context.drawImage(video,0,0,width,height);
      encoder.addFrame(context,{copy:true,delay:Math.max(10,Math.min(1/12,video.duration-time)*1000)});
      notify('Reading frames',Math.floor((frame+1)/frames*50));
    }
    return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{encoder.abort();reject(new Error('GIF encoding timed out.'));},120000);
      encoder.on('progress',value=>notify('Converting GIF',50+Math.floor(value*49)));
      encoder.on('finished',blob=>{clearTimeout(timer);resolve(blob);});
      encoder.on('abort',()=>{clearTimeout(timer);reject(new Error('GIF conversion stopped.'));});
      try{encoder.render();}catch(error){clearTimeout(timer);reject(error);}
    });
  }finally{
    if(encoder){for(const worker of [...(encoder.activeWorkers||[]),...(encoder.freeWorkers||[])])worker.terminate();}
    if(video){video.removeAttribute('src');video.load();}
    if(inputURL)URL.revokeObjectURL(inputURL);
    gifConversionBusy=false;
  }
}
