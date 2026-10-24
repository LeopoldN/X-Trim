// Usability features that need the background page: post facts read from X's own
// GraphQL responses (never requested by X Trim), the daily time limit, and the
// focus mode keyboard shortcut.
let timelineDataEnabled=false;
async function updateTimelineData(){
  const p=await browser.storage.local.get({enabled:true,hidePromoted:false,hideSponsored:false,premiumReplies:false,premiumFeeds:false});
  timelineDataEnabled=p.enabled&&(p.hidePromoted||p.hideSponsored||p.premiumReplies||p.premiumFeeds);
}
updateTimelineData();
browser.storage.onChanged.addListener((c,a)=>{if(a==='local'&&['enabled','hidePromoted','hideSponsored','premiumReplies','premiumFeeds'].some(key=>key in c))updateTimelineData();});
// X marks creator-labelled sponsorships on the post itself; match the field by name so
// a renamed flag still counts while it says partnership or paid promotion.
const sponsoredKey=/paid_?partnership|paid_?promotion|is_?sponsored/i;
function sponsoredFlag(tweet){
  for(const source of [tweet,tweet.legacy])if(source&&typeof source==='object')for(const [key,value] of Object.entries(source))if(sponsoredKey.test(key)&&value)return true;
  return false;
}
function rememberTimelineData(root,tabId){
  if(!timelineDataEnabled)return;
  const tweets={},promoted=new Set(),stack=[root];
  while(stack.length){
    let value=stack.pop();if(!value||typeof value!=='object')continue;
    // Timeline entries carry promotedMetadata beside the tweet they advertise.
    if(value.promotedMetadata&&value.tweet_results?.result){
      const ad=value.tweet_results.result.tweet||value.tweet_results.result;
      if(typeof ad.rest_id==='string')promoted.add(ad.rest_id);
    }
    if(value.__typename==='Tweet'&&typeof value.rest_id==='string'&&/^\d+$/.test(value.rest_id)&&value.legacy&&value.core){
      const user=value.core.user_results?.result||{};
      const handle=user.core?.screen_name||user.legacy?.screen_name;
      tweets[value.rest_id]={
        handle:typeof handle==='string'?handle.toLowerCase():null,
        blue:user.is_blue_verified===true,
        verifiedType:user.verification?.verified_type||user.legacy?.verified_type||null,
        following:(user.relationship_perspectives?.following??user.legacy?.following)===true,
        sponsored:sponsoredFlag(value)
      };
    }
    for(const child of Object.values(value))if(child&&typeof child==='object')stack.push(child);
  }
  for(const id of promoted)tweets[id]={...(tweets[id]||{}),promoted:true};
  if(Object.keys(tweets).length)browser.tabs.sendMessage(tabId,{type:'timeline-data',tweets}).catch(()=>{});
}

// Time on X counts only while an X tab is visible and focused; the page sends a tick
// every 15 seconds, and overlapping ticks from several tabs count once.
const TICK=15;
let usage={day:'',seconds:0,extra:0},lastTick=0,lastSaved=0;
const usageLoaded=browser.storage.local.get({usageToday:usage}).then(value=>{usage=value.usageToday;});
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
async function usageStatus(count){
  await usageLoaded;
  const prefs=await browser.storage.local.get({enabled:true,usageLimit:false,usageMinutes:60});
  const day=today();
  if(usage.day!==day){usage={day,seconds:0,extra:0};lastSaved=0;}
  const active=prefs.enabled&&prefs.usageLimit;
  const limit=Math.max(1,Math.min(1440,Number(prefs.usageMinutes)||60))+usage.extra;
  const wasOver=usage.seconds>=limit*60;
  if(active&&count){
    const now=Date.now();
    usage.seconds+=lastTick?Math.min(TICK,(now-lastTick)/1000):TICK;
    lastTick=now;
  }
  const over=active&&usage.seconds>=limit*60;
  if(Date.now()-lastSaved>60000||over!==wasOver){lastSaved=Date.now();browser.storage.local.set({usageToday:usage}).catch(()=>{});}
  return {active,over,used:Math.floor(usage.seconds/60),limit};
}
browser.runtime.onMessage.addListener(message=>{
  if(message.type==='usage-tick')return usageStatus(message.count===true);
  if(message.type==='usage-extend')return usageLoaded.then(()=>{
    const day=today();if(usage.day!==day)usage={day,seconds:0,extra:0};
    usage.extra+=5;lastSaved=0;return usageStatus(false);
  });
});

// Firefox lets people change this under Manage Extension Shortcuts.
browser.commands?.onCommand.addListener(async name=>{
  if(name!=='toggle-focus-mode')return;
  const {focusMode}=await browser.storage.local.get({focusMode:false});
  await browser.storage.local.set({focusMode:!focusMode});
});
