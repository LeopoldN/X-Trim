// Chrome only: forwards the X API replies chrome/page-hook.js sees to the background,
// where chrome/page-responses.js hands them to the same readers Firefox uses.
document.addEventListener('xtrim-api-response',event=>{
  const detail=event.detail;if(typeof detail!=='string')return;
  const split=detail.indexOf('\n');if(split<0)return;
  browser.runtime.sendMessage({type:'x-api-response',url:detail.slice(0,split),body:detail.slice(split+1)}).catch(()=>{});
});
