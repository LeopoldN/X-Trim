(() => {
  const permission={origins:['https://video.twimg.com/*'],data_collection:['websiteContent']};
  const button=document.getElementById('enable-gif-downloads');
  const status=document.getElementById('gif-permission-status');
  async function refresh(){
    try{
      const allowed=await browser.permissions.contains(permission);
      button.hidden=allowed;
      status.textContent=allowed?'Media downloads enabled. GIF conversion happens locally.':'Downloads request the selected media from X’s servers. Allow website-content transmission and video.twimg.com access once. GIF conversion stays local.';
    }catch{status.textContent='Could not check media permissions. Reopen this popup to retry.';}
  }
  button.onclick=async()=>{
    try{
      // Request directly inside the click handler to preserve Firefox's user gesture.
      const request=browser.permissions.request(permission);
      button.disabled=true;
      const allowed=await request;
      await refresh();
      if(!allowed)status.textContent='Permission was not granted. You can enable media downloads here whenever you want.';
    }catch(error){status.textContent='Could not enable media downloads: '+error.message;}
    finally{button.disabled=false;}
  };
  browser.permissions.onAdded.addListener(refresh);
  browser.permissions.onRemoved.addListener(refresh);
  refresh();
})();
