(async()=>{
  const token=new URL(location.href).searchParams.get('job');
  const status=document.getElementById('conversion-status'),progress=document.getElementById('conversion-progress');
  let outputURL;
  window.addEventListener('pagehide',()=>{if(outputURL)URL.revokeObjectURL(outputURL);});
  try{
    const job=await browser.runtime.sendMessage({type:'gif-conversion-ready',token});
    if(!job?.url)throw new Error('This conversion has expired. Retry from the X post.');
    const blob=await convertTwitterGif(job.url,(stage,percent)=>{
      status.textContent=stage+(percent===null?'':` ${percent}%`);
      if(percent===null)progress.removeAttribute('value');else progress.value=percent;
      browser.runtime.sendMessage({type:'gif-conversion-progress',token,stage,percent}).catch(()=>{});
    });
    outputURL=URL.createObjectURL(blob);status.textContent='Choose where to save your GIF…';progress.value=100;
    await browser.runtime.sendMessage({type:'gif-conversion-result',token,url:outputURL});
  }catch(error){
    status.textContent=error.message;
    browser.runtime.sendMessage({type:'gif-conversion-result',token,error:error.message}).catch(()=>{});
  }
})();
