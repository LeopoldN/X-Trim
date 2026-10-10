(() => {
  const permission={origins:['https://video.twimg.com/*']};
  const button=document.getElementById('enable-gif-downloads');
  const status=document.getElementById('gif-permission-status');
  async function refresh(){
    try{
      const allowed=await browser.permissions.contains(permission);
      button.hidden=allowed;
      status.textContent=allowed?'GIF downloads enabled. Conversion happens locally.':'GIF conversion needs permission to fetch videos from video.twimg.com. Click below to allow it once.';
    }catch{status.textContent='Could not check GIF permissions. Reopen this popup to retry.';}
  }
  button.onclick=async()=>{
    try{
      // Request directly inside the click handler to preserve Firefox's user gesture.
      const request=browser.permissions.request(permission);
      button.disabled=true;
      const allowed=await request;
      await refresh();
      if(!allowed)status.textContent='Permission was not granted. You can enable GIF downloads here whenever you want.';
    }catch(error){status.textContent='Could not enable GIF downloads: '+error.message;}
    finally{button.disabled=false;}
  };
  browser.permissions.onAdded.addListener(refresh);
  browser.permissions.onRemoved.addListener(refresh);
  refresh();
})();
