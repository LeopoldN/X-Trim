(() => {
  let enabled=true, show=true, queued=false, busy=false;
  function author(article){const link=article.querySelector('[data-testid="User-Name"] a[href]');return link?new URL(link.href).pathname.match(/^\/([a-z0-9_]{1,15})\/?$/i)?.[1]:null;}
  function notify(message){let node=document.querySelector('.xtrim-block-status');if(!node){node=document.createElement('div');node.className='xtrim-block-status';node.setAttribute('role','status');document.body.append(node);}node.textContent=message;clearTimeout(node.timer);node.timer=setTimeout(()=>node.remove(),6000);}
  async function start(article,button){
    if(busy||!enabled||!show)return;
    const handle=author(article),caret=article.querySelector('[data-testid="caret"]');
    if(!handle||!caret)return;
    if(document.querySelector('[role="menu"], [data-testid="confirmationSheetDialog"]')){notify('Close the open menu or dialog, then try again.');return;}
    busy=true;button.disabled=true;
    try{
      caret.click();
      const item=await new Promise(resolve=>{
        const check=()=>{const menu=document.querySelector('[role="menu"]');const block=menu?.querySelector('[data-testid="block"]');if(block){cleanup();resolve(block);}};
        const observer=new MutationObserver(check);const timer=setTimeout(()=>{cleanup();resolve(null);},2000);
        function cleanup(){observer.disconnect();clearTimeout(timer);}
        observer.observe(document.documentElement,{childList:true,subtree:true});check();
      });
      if(!enabled||!show||!article.isConnected||author(article)!==handle)return;
      if(!item){notify('Block is unavailable here. Use the post’s More menu.');return;}
      // Only select the native Block action. X owns the confirmation and request.
      // Never use the separate Unblock item or submit the confirmation ourselves.
      const mentioned=item.textContent.match(/@([a-z0-9_]{1,15})/i)?.[1];
      if(mentioned&&mentioned.toLowerCase()!==handle.toLowerCase()){notify('The menu changed. Close it and try again.');return;}
      item.click();
    }finally{busy=false;button.disabled=false;}
  }
  function scan(){
    queued=false;
    for(const button of document.querySelectorAll('.xtrim-post-block'))if(!enabled||!show||!button.closest('article[data-testid="tweet"]'))button.remove();
    if(!enabled||!show)return;
    for(const article of document.querySelectorAll('article[data-testid="tweet"]')){
      const handle=author(article);if(!handle)continue;
      const grok=[...article.querySelectorAll('button[aria-label*="Grok"], [role="button"][aria-label*="Grok"]')].find(node=>node.closest('article')===article);
      if(!grok)continue;
      let button=article.querySelector('.xtrim-post-block');
      if(!button){
        button=document.createElement('button');button.type='button';button.className='xtrim-post-block';
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
        const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','12');circle.setAttribute('cy','12');circle.setAttribute('r','8.5');
        const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d','m6 6 12 12');svg.append(circle,line);button.append(svg);
        button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();start(article,button).catch(()=>notify('Could not open Block. Use the post’s More menu.'));});
      }
      const size=grok.getBoundingClientRect().height;
      if(size>0)button.style.setProperty('--xtrim-block-size',Math.min(size,34)+'px');
      const label='Block @'+handle; if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.title=label;}
      // Share the Grok button's horizontal control group, before its wrapper.
      const wrapper=grok.parentElement.children.length===1?grok.parentElement:grok;
      if(button.nextElementSibling!==wrapper)wrapper.before(button);
    }
  }
  function schedule(){if(!queued){queued=true;setTimeout(scan,100);}}
  async function settings(){const prefs=await browser.storage.local.get({enabled:true,postBlock:true});enabled=prefs.enabled;show=prefs.postBlock;schedule();}
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.enabled||changes.postBlock))settings();});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});settings();
})();
