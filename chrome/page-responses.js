// Chrome only: X API replies forwarded by chrome/page-bridge.js, read exactly like
// Firefox's response filter in background/media-download.js reads them.
const pageResponseURL=/^https:\/\/(?:x|twitter)\.com\/i\/api\/(?:graphql\/|1\.1\/blocks\/[^?#]*\.json)/;
browser.runtime.onMessage.addListener((message,sender)=>{
  if(message?.type!=='x-api-response'||!sender.tab||sender.tab.id<0||!responseCaptureEnabled())return;
  let page;try{page=new URL(sender.url);}catch{return;}
  if(page.protocol!=='https:'||!['x.com','twitter.com'].includes(page.hostname))return;
  if(typeof message.url!=='string'||!pageResponseURL.test(message.url)||typeof message.body!=='string'||message.body.length>8*1024*1024)return;
  try{readXResponse(JSON.parse(message.body),sender.tab.id,message.url);}catch{}
});
