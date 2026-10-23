// Observe X's own responses locally; no requests or persistent block list.
let blockStateEnabled=false;
async function updateBlockState(){const p=await browser.storage.local.get({enabled:true,postBlock:true});blockStateEnabled=p.enabled&&p.postBlock;}
updateBlockState();
browser.storage.onChanged.addListener((c,a)=>{if(a==='local'&&(c.enabled||c.postBlock))updateBlockState();});
function rememberBlockState(root,tabId,url){
  if(!blockStateEnabled)return;
  const states={},stack=[root];
  while(stack.length){
    const user=stack.pop();if(!user||typeof user!=='object')continue;
    const handle=user.core?.screen_name||user.legacy?.screen_name||user.screen_name;
    let blocked=user.relationship_perspectives?.blocking??user.legacy?.blocking??user.blocking;
    if(user===root&&typeof handle==='string'&&!root.errors){if(/\/blocks\/create\.json/.test(url||''))blocked=true;else if(/\/blocks\/destroy\.json/.test(url||''))blocked=false;}
    if(typeof handle==='string'&&/^[a-z0-9_]{1,15}$/i.test(handle)&&typeof blocked==='boolean')states[handle.toLowerCase()]=blocked;
    for(const child of Object.values(user))if(child&&typeof child==='object')stack.push(child);
  }
  if(Object.keys(states).length)browser.tabs.sendMessage(tabId,{type:'block-state',states}).catch(()=>{});
}
