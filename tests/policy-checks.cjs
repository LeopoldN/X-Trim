// Run with Node.js. No network or browser profile access.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
function evaluate(file,context){vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),context,{filename:file});}
function event(){return {listeners:[],addListener(fn){this.listeners.push(fn);}};}
async function accountChecks(){
 let allowed=true,fetches=0,failFetch=false,relayed=[];const writes=[];
 const about={data:{user_result_by_screen_name:{result:{core:{screen_name:'example'},about_profile:{account_based_in:'Earth',source:'Web'}}}}};
 const store={enabled:true,profileAbout:true,postAbout:false,aboutCache:{},aboutCooldown:0};
 const browser={storage:{local:{get:async defaults=>({...defaults,...store}),set:async value=>{writes.push(value);Object.assign(store,value);}},onChanged:event()},permissions:{contains:async()=>allowed,onAdded:event(),onRemoved:event()},tabs:{onRemoved:event(),sendMessage:async(id,message)=>{relayed.push(message);return relayReply;}},webRequest:{onBeforeSendHeaders:event()},runtime:{onMessage:event()}};
 let relayReply=null;
 const context=vm.createContext({browser,URL,Map,Set,Date,Promise,setTimeout,clearTimeout,AbortController,console:{warn(){}},JSON,fetch:async()=>{fetches++;if(failFetch)throw new TypeError('NetworkError when attempting to fetch resource.');return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(about)};}});
 evaluate('shared/data-consent.js',context);evaluate('background/account-details.js',context);
 const sender={url:'https://x.com/example',tab:{id:4,url:'https://x.com/example',incognito:true}};
 const message={handle:'example',csrf:'a'.repeat(32)};
 assert.equal((await context.lookupAbout(message,sender)).ok,true);
 assert.equal(writes.length,0,'private account responses must not write to disk');
 sender.tab.incognito=false;assert.equal((await context.lookupAbout(message,sender)).ok,true);assert.equal(fetches,2);assert.equal(writes.filter(v=>v.aboutCache).length,1);
 // A blocked background request is retried from the X tab, then reported as unreachable if that fails too.
 failFetch=true;relayReply={status:200,body:JSON.stringify(about)};
 assert.equal((await context.lookupAbout({...message,refresh:true},sender)).ok,true);
 assert.match(relayed.at(-1).url,/^https:\/\/x\.com\/i\/api\/graphql\/[^/]+\/AboutAccountQuery\?/);assert.equal(relayed.at(-1).headers['x-csrf-token'],message.csrf);
 relayReply=null;assert.equal((await context.lookupAbout({...message,refresh:true},sender)).error,'network-error');
 relayReply={status:200,body:'<html>'};assert.equal((await context.lookupAbout({...message,refresh:true},sender)).error,'bad-response');
 failFetch=false;
 allowed=false;const before=fetches;assert.equal((await context.lookupAbout({...message,refresh:true},sender)).error,'consent-required');assert.equal(fetches,before);
 const parsed=context.parseAbout({data:{user_result_by_screen_name:{result:{core:{screen_name:'example',name:'Example'},rest_id:'42',about_profile:{username_changes:{count:0}},legacy:{followers_count:0,friends_count:-1,statuses_count:123},is_blue_verified:true}}}},'example');
 assert.equal(parsed.followers,0);assert.equal(parsed.following,null);assert.equal(parsed.handleChanges,0);assert.equal(parsed.verification,'Blue');assert.equal(parsed.connectedVia,null);
 assert.throws(()=>context.parseAbout({data:{user_result_by_screen_name:{result:{core:{screen_name:'other'},about_profile:{}}}}},'example'),/account-mismatch/);
 allowed=true;sender.tab.url='https://x.com/home';
 assert.equal((await context.lookupAbout({...message,timeline:true},sender)).error,'disabled');
 store.geoBlocking=true;
 assert.equal((await context.lookupAbout({...message,timeline:true},sender)).ok,true);
 assert.equal((await context.lookupAbout(message,sender)).error,'invalid-page');
 allowed=false;assert.equal((await context.lookupAbout({...message,timeline:true},sender)).error,'consent-required');
 console.log('PASS account consent, private-cache isolation, metadata and timeline scope enforcement');
}
async function downloadChecks(){
 let allowed=false,downloaded=0;const sent=[];let filter,forwarded=[];
 const browser={storage:{local:{get:async defaults=>defaults},onChanged:event()},permissions:{contains:async()=>allowed},webRequest:{onBeforeRequest:event(),filterResponseData:()=>filter={write:bytes=>forwarded.push(bytes),close(){}}},tabs:{onRemoved:event(),sendMessage:async(id,message)=>sent.push(message)},runtime:{onMessage:event()},downloads:{onChanged:event(),download:async()=>{downloaded++;return 9;},search:async()=>[{state:'complete',bytesReceived:100,totalBytes:100}]}};
 const context=vm.createContext({browser,URL,Map,Date,Uint8Array,TextDecoder,Promise});evaluate('shared/data-consent.js',context);evaluate('background/media-download.js',context);await new Promise(setImmediate);
 const handler=browser.runtime.onMessage.listeners[1],sender={url:'https://x.com/a/status/12',tab:{id:3}};
 const message={type:'media-download',url:'https://video.twimg.com/a.mp4',postId:'12'};
 assert.equal((await handler(message,sender)).ok,false);assert.equal(downloaded,0);
 allowed=true;assert.equal((await handler(message,sender)).ok,true);assert.equal(downloaded,1);
 assert.equal((await handler({...message,url:'https://evil.example/a.mp4'},sender)).ok,false);
 assert.equal((await handler(message,{url:'https://evil.example',tab:{id:3}})).ok,false);
 assert.equal((await handler({type:'media-download-progress',id:9},{tab:{id:4}})).ok,false);
 assert.equal((await handler({type:'media-download-progress',id:9},sender)).state,'complete');
 browser.webRequest.onBeforeRequest.listeners[0]({tabId:3,requestId:'fixture'});
 const bytes=new TextEncoder().encode(JSON.stringify({id_str:'123',media_url_https:'https://pbs.twimg.com/amplify_video_thumb/456/a.jpg',video_info:{variants:[{url:'https://video.twimg.com/a.mp4',bitrate:10},{url:'https://video.twimg.com/b.mp4',bitrate:20},{url:'https://evil.example/c.mp4',bitrate:100},{url:'https://video.twimg.com/d.m3u8',bitrate:200}]}}));
 filter.ondata({data:bytes.buffer});filter.onstop();assert.deepEqual(new Uint8Array(forwarded[0]),bytes);assert.equal(sent.at(-1).variants['456'],'https://video.twimg.com/b.mp4');
 console.log('PASS download consent, URL allowlist, ownership, variant matching and response pass-through');
}
async function popupChecks(){
 for(const choice of [true,false]){
  let allowed=false,requested=0;const button={},status={};
  const browser={permissions:{contains:async()=>allowed,request:async permission=>{assert.equal(permission.origins[0],'https://video.twimg.com/*');assert.deepEqual(Array.from(permission.data_collection),['websiteContent']);requested++;return allowed=choice;},onAdded:event(),onRemoved:event()}};
  const context=vm.createContext({browser,document:{getElementById:id=>id==='enable-gif-downloads'?button:status}});evaluate('popup/media-permissions.js',context);await new Promise(setImmediate);assert.equal(button.hidden,false);await button.onclick();assert.equal(requested,1);assert.equal(button.hidden,choice);assert.equal(button.disabled,false);
 }
 console.log('PASS optional media consent grant/denial UI');
}
(async()=>{await accountChecks();await downloadChecks();await popupChecks();})().catch(error=>{console.error(error);process.exitCode=1;});
