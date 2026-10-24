// Chrome only, loaded before X Trim's own scripts in every Chrome context. X Trim is
// written against Firefox's browser.* API; this maps the few calls that differ.
(()=>{
  if(globalThis.xtrimBrowserCompat)return;
  globalThis.xtrimBrowserCompat=true;
  const native=globalThis.chrome;
  // An empty proxy target keeps Proxy invariants clear of Chrome's own property flags.
  const wrap=(target,overrides)=>new Proxy({},{
    get(_,key){
      if(Object.hasOwn(overrides,key))return overrides[key];
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    },
    has:(_,key)=>Object.hasOwn(overrides,key)||key in target
  });
  // Firefox replies with a listener's returned promise, rejections included. Chrome
  // before 148 needs sendResponse, so carry the outcome in an envelope.
  const REPLY='__xtrimReply';
  const unwrap=reply=>{
    if(!reply||typeof reply!=='object'||!(REPLY in reply))return reply;
    if('error' in reply)throw new Error(reply.error);
    return reply.value;
  };
  const wrapped=new Map();
  const replying=fn=>{
    if(!wrapped.has(fn))wrapped.set(fn,(message,sender,sendResponse)=>{
      const result=fn(message,sender);
      if(!result||typeof result.then!=='function')return;
      result.then(value=>sendResponse({[REPLY]:true,value}),error=>sendResponse({[REPLY]:true,error:String(error?.message||error)}));
      return true;
    });
    return wrapped.get(fn);
  };
  const onMessage=wrap(native.runtime.onMessage,{
    addListener:fn=>native.runtime.onMessage.addListener(replying(fn)),
    removeListener:fn=>native.runtime.onMessage.removeListener(replying(fn)),
    hasListener:fn=>native.runtime.onMessage.hasListener(replying(fn))
  });
  // Chrome has no built-in data-collection consent. The popup buttons and switches that
  // ask Firefox for it record the person's choice in X Trim's own storage instead.
  const CONSENT='chromeDataConsent';
  const granted=async()=>(await native.storage.local.get({[CONSENT]:[]}))[CONSENT];
  const split=permissions=>{const {data_collection:data=[],...rest}=permissions||{};return {data,rest,native:Object.keys(rest).length>0};};
  const consentEvent=(event,added)=>wrap(event,{addListener:fn=>{
    event.addListener(fn);
    native.storage.onChanged.addListener((changes,area)=>{
      const change=changes[CONSENT];if(area!=='local'||!change)return;
      const before=change.oldValue||[],after=change.newValue||[];
      const types=added?after.filter(type=>!before.includes(type)):before.filter(type=>!after.includes(type));
      if(types.length)fn({origins:[],permissions:[],data_collection:types});
    });
  }});
  // Content scripts have no permissions API.
  const permissions=native.permissions&&wrap(native.permissions,{
    async contains(request){
      const {data,rest,native:needsNative}=split(request);
      if(data.length){const have=await granted();if(!data.every(type=>have.includes(type)))return false;}
      return needsNative?native.permissions.contains(rest):true;
    },
    request(request){
      const {data,rest,native:needsNative}=split(request);
      // Ask Chrome first and synchronously, inside the click's user gesture.
      const asked=needsNative?native.permissions.request(rest):Promise.resolve(true);
      return asked.then(async allowed=>{
        if(!allowed||!data.length)return allowed;
        await native.storage.local.set({[CONSENT]:[...new Set([...(await granted()),...data])]});
        return true;
      });
    },
    onAdded:consentEvent(native.permissions.onAdded,true),
    onRemoved:consentEvent(native.permissions.onRemoved,false)
  });
  const runtime=wrap(native.runtime,{onMessage,sendMessage:(...args)=>native.runtime.sendMessage(...args).then(unwrap)});
  const overrides={runtime};
  if(permissions)overrides.permissions=permissions;
  if(native.tabs)overrides.tabs=wrap(native.tabs,{sendMessage:(...args)=>native.tabs.sendMessage(...args).then(unwrap)});
  Object.defineProperty(globalThis,'browser',{value:wrap(native,overrides),configurable:true,writable:true});
})();
