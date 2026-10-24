(() => {
  const defaults={enabled:true,geoBlocking:false,geoCountries:'',geoAllowed:'',geoMode:'hide'};
  let prefs=defaults, running=false, scheduled=false, retryTimer, generation=0;
  const records=new Map(), cache=new Map(), revealed=new Set();
  const names=new Intl.DisplayNames(['en'],{type:'region'});
  const normalize=value=>{let text=String(value||'').trim();if(/^[a-z]{2}$/i.test(text))text=names.of(text.toUpperCase());return text.toLowerCase().replace(/^united states of america$/,'united states').replace(/^turkey$/,'türkiye');};
  const list=value=>String(value||'').split(/[,\n]/).map(normalize).filter(Boolean);
  const active=()=>prefs.enabled&&prefs.geoBlocking&&list(prefs.geoCountries).length>0;
  function identity(article){
    const name=article.querySelector('[data-testid="User-Name"]');
    const link=name?.querySelector('a[href]');
    const handle=link?new URL(link.href).pathname.match(/^\/([a-z0-9_]{1,15})\/?$/i)?.[1]?.toLowerCase():null;
    const time=[...article.querySelectorAll('a[href*="/status/"]')].find(a=>a.querySelector('time')&&a.closest('article')===article);
    const id=time?new URL(time.href).pathname.match(/\/status\/(\d+)/)?.[1]:null;
    return handle&&id?{handle,id,key:handle+'/'+id}:null;
  }
  function restore(article){article.removeAttribute('data-xtrim-geo');article.querySelector(':scope > .xtrim-geo-notice')?.remove();}
  function apply(article,record){
    const current=identity(article);if(!current||current.key!==record.key){restore(article);return;}
    const data=cache.get(record.handle)?.data;
    const allowed=String(prefs.geoAllowed).toLowerCase().split(/[,\s]+/).map(v=>v.replace(/^@/,''));
    const opened=xtrimPagePath().match(/\/status\/(\d+)/)?.[1]===record.id;
    const blocked=active()&&data?.ok&&list(prefs.geoCountries).includes(normalize(data.basedIn))&&!allowed.includes(record.handle)&&!revealed.has(record.key);
    if(!blocked){restore(article);return;}
    const mode=opened||prefs.geoMode==='highlight'?'highlight':prefs.geoMode==='remove'?'remove':'hide';
    article.dataset.xtrimGeo=mode;
    if(mode!=='hide'){article.querySelector(':scope > .xtrim-geo-notice')?.remove();return;}
    let notice=article.querySelector(':scope > .xtrim-geo-notice');
    if(!notice){notice=document.createElement('div');notice.className='xtrim-geo-notice';article.prepend(notice);}
    const label=`@${record.handle} · ${data.basedIn}${data.approximate?' (location may be inaccurate)':''}`;
    if(notice.dataset.label===label&&notice.dataset.mode===mode)return;
    notice.dataset.label=label;notice.dataset.mode=mode;notice.replaceChildren();
    const text=document.createElement('span');text.textContent=label;notice.append(text);
    const button=document.createElement('button');button.type='button';button.textContent=mode==='hide'?'Show post':'Clear highlight';
    button.onclick=event=>{event.preventDefault();event.stopPropagation();revealed.add(record.key);while(revealed.size>500)revealed.delete(revealed.values().next().value);restore(article);};notice.append(button);
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const record=records.get(entry.target);if(record)record.visible=entry.isIntersecting;}pump();},{rootMargin:'200px'});
  function scan(){
    scheduled=false;
    for(const [article] of records)if(!article.isConnected||!active()){restore(article);observer.unobserve(article);records.delete(article);}
    if(!active())return;
    for(const article of document.querySelectorAll('article[data-testid="tweet"]')){
      const ident=identity(article);if(!ident){restore(article);observer.unobserve(article);records.delete(article);continue;}
      let record=records.get(article);
      if(!record||record.key!==ident.key){restore(article);record={...ident,visible:false};records.set(article,record);observer.unobserve(article);observer.observe(article);}
      apply(article,record);
    }
    pump();
  }
  function schedule(){if(!scheduled){scheduled=true;setTimeout(scan,100);}}
  async function pump(){
    if(running||!active())return;
    const candidate=[...records.entries()].find(([article,r])=>article.isConnected&&r.visible&&(!cache.has(r.handle)||cache.get(r.handle).expires<=Date.now()));
    if(!candidate)return;
    running=true;const [,record]=candidate, token=generation;
    let result;
    try{result=await browser.runtime.sendMessage({type:'about-lookup',timeline:true,handle:record.handle,csrf:document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/)?.[1]||''});}catch{result={ok:false};}
    running=false;
    if(token!==generation){schedule();return;}
    const delay=result?.ok?86400000:result?.error==='not-available'?3600000:60000;
    cache.delete(record.handle);cache.set(record.handle,{data:result,expires:Date.now()+delay});while(cache.size>500)cache.delete(cache.keys().next().value);
    for(const [article,r] of records)if(r.handle===record.handle)apply(article,r);
    clearTimeout(retryTimer);retryTimer=setTimeout(schedule,60000);
    setTimeout(pump,result?.error==='rate-limited'?60000:0);
  }
  async function settings(){prefs=await browser.storage.local.get(defaults);generation++;if(!active()){cache.clear();clearTimeout(retryTimer);}schedule();}
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&Object.keys(defaults).some(key=>key in changes))settings();});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',schedule);settings();
})();
