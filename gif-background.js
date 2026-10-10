// A visible extension tab supplies the compositor Zen needs for video decoding.
const gifConversions=new Map();
async function startGifConversion(url,sourceTabId,token){
  if(gifConversions.size)throw new Error('Another GIF is converting. Wait for it to finish.');
  const jobId=crypto.randomUUID();
  let resolve,reject;
  const result=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const job={url,sourceTabId,token,resolve,reject};gifConversions.set(jobId,job);
  // Register before opening the tab: its script can send ready immediately.
  try{
    const tab=await browser.tabs.create({url:browser.runtime.getURL('gif-converter.html')+'?job='+jobId,active:true});
    job.tabId=tab.id;
    job.timer=setTimeout(()=>{gifConversions.delete(jobId);browser.tabs.remove(tab.id).catch(()=>{});reject(new Error('GIF conversion timed out.'));},240000);
    const objectURL=await result;
    return {objectURL,conversionTabId:tab.id};
  }catch(error){if(job.tabId)browser.tabs.remove(job.tabId).catch(()=>{});throw error;}
  finally{clearTimeout(job.timer);gifConversions.delete(jobId);}
}
browser.runtime.onMessage.addListener((message,sender)=>{
  if(!['gif-conversion-ready','gif-conversion-progress','gif-conversion-result'].includes(message.type))return;
  const job=gifConversions.get(message.token);
  if(!job||!sender.tab)return;
  let page;try{page=new URL(sender.url);}catch{return;}
  const expected=new URL(browser.runtime.getURL('gif-converter.html'));
  if(page.origin!==expected.origin||page.pathname!==expected.pathname||page.searchParams.get('job')!==message.token)return;
  if(job.tabId!==undefined&&sender.tab.id!==job.tabId)return;
  job.tabId=sender.tab.id;
  if(message.type==='gif-conversion-ready')return Promise.resolve({url:job.url});
  if(message.type==='gif-conversion-progress'){
    browser.tabs.sendMessage(job.sourceTabId,{type:'media-gif-progress',token:job.token,stage:message.stage,percent:message.percent}).catch(()=>{});
  }else if(message.error)job.reject(new Error(String(message.error)));
  else if(typeof message.url==='string'&&message.url.startsWith('blob:'+expected.origin+'/'))job.resolve(message.url);
});
browser.tabs.onRemoved.addListener(tabId=>{
  for(const job of gifConversions.values())if(job.tabId===tabId)job.reject(new Error('GIF conversion tab was closed. Retry from the post.'));
});
