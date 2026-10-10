browser.runtime.onMessage.addListener((message,sender)=>{
  if(message.type!=='media-download')return;
  return (async()=>{
    try {
      const source=new URL(sender.url),url=new URL(message.url);
      if(!sender.tab||source.protocol!=='https:'||!['x.com','twitter.com'].includes(source.hostname)||url.protocol!=='https:'||url.username||url.password||url.port||!/^\d+$/.test(message.postId))return {ok:false};
      const video=url.hostname==='video.twimg.com'&&url.pathname.endsWith('.mp4');
      const image=url.hostname==='pbs.twimg.com'&&url.pathname.startsWith('/media/');
      if(!video&&!image)return {ok:false};
      let name=url.pathname.split('/').pop().replace(/[^a-z0-9._-]/gi,'_');
      if(image) {
        const format=(url.searchParams.get('format')||name.split('.').pop()).toLowerCase();
        if(!['jpg','jpeg','png','webp'].includes(format))return {ok:false};
        url.searchParams.set('name','orig');
        if(!/\.(jpg|jpeg|png|webp)$/i.test(name))name+='.'+format;
      }
      const id=await browser.downloads.download({url:url.href,filename:`x-${message.postId}-${name}`,saveAs:true});
      return {ok:true,id};
    }catch{return {ok:false};}
  })();
});
