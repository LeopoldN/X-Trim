// Chrome only, runs in X's own page. Chrome extensions can't read responses the way
// Firefox's filterResponseData does, so this passes X's own API replies to
// chrome/page-bridge.js. It changes nothing, requests nothing and stores nothing.
(()=>{
  const wanted=/^https:\/\/(?:x|twitter)\.com\/i\/api\/(?:graphql\/|1\.1\/blocks\/[^?#]*\.json)/;
  const LIMIT=8*1024*1024;
  const send=(url,text)=>{
    if(typeof text==='string'&&text.length<=LIMIT)document.dispatchEvent(new CustomEvent('xtrim-api-response',{detail:url+'\n'+text}));
  };
  const target=url=>{try{const href=new URL(url,location.href).href;return wanted.test(href)?href:null;}catch{return null;}};
  const open=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url){
    const href=target(url);
    if(href)this.addEventListener('load',()=>{
      try{const type=this.responseType;send(href,type===''||type==='text'?this.responseText:type==='json'?JSON.stringify(this.response):null);}catch{}
    },{once:true});
    return open.apply(this,arguments);
  };
  const nativeFetch=window.fetch;
  window.fetch=function(input){
    const promise=nativeFetch.apply(this,arguments);
    const href=target(input instanceof Request?input.url:input);
    if(href)promise.then(response=>response.clone().text()).then(text=>send(href,text)).catch(()=>{});
    return promise;
  };
})();
