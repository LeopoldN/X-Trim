// Run with Node.js and Playwright's Chromium. x.com is served from a local fixture that
// follows the live post header: the Grok button and More (caret) share an 8px-gap group.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const header=handle=>`<div style="display:flex;align-items:start;justify-content:space-between"><div data-testid="User-Name"><a href="/${handle}">${handle}</a></div><div style="display:flex;margin-left:8px"><div class="group" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><div class="grok-wrap" style="display:flex"><button role="button" type="button" aria-label="Grok actions" style="display:flex;width:19px;height:20px;padding:0;border:0">G</button></div><div class="caret-wrap" style="display:flex;align-items:center"><div><div style="display:flex"><button data-testid="caret" aria-label="More" style="display:flex;width:19px;height:20px;padding:0;border:0">⋯</button></div></div></div></div></div></div>`;
const post=(id,handle,quote='')=>`<article data-testid="tweet" id="p${id}">${header(handle)}<div data-testid="tweetText">post ${id}</div>${quote}</article>`;
const body=`<html><body><main>${post(1,'alpha')}${post(2,'beta','<div role="link" class="quote"><div data-testid="User-Name"><a href="/gamma">gamma</a></div></div>')}</main></body></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();page.setDefaultTimeout(5000);
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body}));await page.goto('https://x.com/home');
 await page.evaluate(()=>{
   window.prefs={enabled:true,postBlock:true,hidePostGrok:true};
   const listeners=[];
   window.browser={runtime:{onMessage:{addListener:()=>{}},sendMessage:async()=>({over:false})},storage:{local:{get:async d=>({...d,...prefs})},onChanged:{addListener:f=>listeners.push(f)}}};
   window.changed=(changes,area)=>{for(const [k,v] of Object.entries(changes))prefs[k]=v.newValue;listeners.forEach(f=>f(changes,area));};
 });
 for(const file of ['content/usability.css','content/post-block.css'])await page.addStyleTag({path:path.resolve(file)});
 for(const file of ['content/page-route.js','content/usability.js','content/post-block.js'])await page.addScriptTag({path:path.resolve(file)});
 const display=selector=>page.evaluate(s=>[...document.querySelectorAll(s)].map(el=>getComputedStyle(el).display),selector);
 await page.waitForFunction(()=>document.documentElement.hasAttribute('data-xtrim-hide-post-grok'));
 await page.getByRole('button',{name:'Block @alpha',exact:true}).waitFor();await page.getByRole('button',{name:'Block @beta',exact:true}).waitFor();
 // Grok and its wrapper are gone; More stays.
 assert.deepEqual(await display('[aria-label="Grok actions"]'),['none','none']);
 assert.deepEqual(await display('.grok-wrap'),['none','none']);
 assert.deepEqual(await display('.group'),['flex','flex']);
 assert.deepEqual(await display('[data-testid="caret"]'),['flex','flex']);
 // The Block button keeps its place in the group, takes the caret's size and sits 16px
 // (its margin plus the group gap) before More, with no blank left by the hidden Grok.
 const layout=await page.evaluate(()=>[...document.querySelectorAll('article')].map(article=>{
   const block=article.querySelector('.xtrim-post-block'),caret=article.querySelector('[data-testid="caret"]'),b=block.getBoundingClientRect(),c=caret.getBoundingClientRect();
   return {parent:block.parentElement.className,next:block.nextElementSibling.className,size:[b.width,b.height],gap:Math.round(c.left-b.right),middle:Math.round((b.top+b.bottom)/2-(c.top+c.bottom)/2)};
 }));
 for(const item of layout)assert.deepEqual(item,{parent:'group',next:'grok-wrap',size:[20,20],gap:16,middle:0});
 // Turning the option off brings Grok back between Block and More.
 await page.evaluate(()=>changed({hidePostGrok:{newValue:false}},'local'));
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-xtrim-hide-post-grok'));
 assert.deepEqual(await display('[aria-label="Grok actions"]'),['flex','flex']);
 const shown=await page.evaluate(()=>{const block=document.querySelector('#p1 .xtrim-post-block').getBoundingClientRect(),grok=document.querySelector('#p1 [aria-label="Grok actions"]').getBoundingClientRect(),caret=document.querySelector('#p1 [data-testid="caret"]').getBoundingClientRect();return [Math.round(grok.left-block.right),Math.round(caret.left-grok.right)];});
 assert.deepEqual(shown,[16,8]);
 // The master switch restores Grok too.
 await page.evaluate(()=>changed({hidePostGrok:{newValue:true}},'local'));await page.waitForFunction(()=>document.documentElement.hasAttribute('data-xtrim-hide-post-grok'));
 await page.evaluate(()=>changed({enabled:{newValue:false}},'local'));await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-xtrim-hide-post-grok'));
 assert.deepEqual(await display('[aria-label="Grok actions"]'),['flex','flex']);
 await browser.close();console.log('PASS Grok hidden with its gap, Block button sized and placed beside More, off and master switch restore it');
})().catch(e=>{console.error(e);process.exitCode=1;});
