const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage();
 await page.route('https://x.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<html><body><div data-testid="cellInnerDiv"><div style="border-bottom:1px solid rgb(47,51,54)"><article data-testid="tweet"><div><div><div id="spacer"></div><div style="display:flex"><div id="avatar"></div><div id="content" style="padding-bottom:12px"><div data-testid="User-Name">A</div><div data-testid="tweetText"><span>𝗕𝗼𝗹𝗱 and 𝘪𝘵𝘢𝘭𝘪𝘤 ℎ𝟭 ok</span></div><button data-testid="12-follow"><span>Follow</span></button><button data-testid="34-unfollow"><span>Following</span></button></div></div></div></div></article></div></div><div id="name">𝗡𝗮𝗺𝗲</div></body></html>'}));await page.goto('https://x.com/home');
 await page.evaluate(()=>{window.prefs={enabled:true,plainText:true,followColors:true,themeMode:'custom',themeCustom:{accent:'#D79921'},siteFont:'serif',textSize:120,density:'compact',hideDividers:true,customCss:'@import url(https://evil.example/a.css); #name{color:rgb(1,2,3) !important}'};window.browser={storage:{local:{get:async d=>({...d,...prefs})},onChanged:{addListener:f=>window.changed=f}}};});
 await page.addScriptTag({path:path.resolve('theme-extras.js')});
 const text=page.locator('[data-testid="tweetText"] span');
 await page.waitForFunction(()=>document.querySelector('[data-testid="tweetText"] span').textContent==='Bold and italic h1 ok');
 assert.equal(await page.locator('#name').textContent(),'𝗡𝗮𝗺𝗲','text outside posts must stay untouched');
 // Text X adds later is converted, including text changed in place.
 await page.evaluate(()=>{const cell=document.querySelector('[data-testid="cellInnerDiv"]').cloneNode(true);cell.querySelector('span').textContent='𝙉𝙚𝙬';document.body.append(cell);});
 await page.waitForFunction(()=>document.querySelectorAll('[data-testid="tweetText"] span')[1].textContent==='New');
 await page.evaluate(()=>{document.querySelector('[data-testid="tweetText"] span').firstChild.nodeValue='𝐀𝐠𝐚𝐢𝐧';});
 await page.waitForFunction(()=>document.querySelector('[data-testid="tweetText"] span').textContent==='Again');
 const styles=await page.evaluate(()=>{const css=el=>getComputedStyle(document.querySelector(el));return {follow:css('[data-testid="12-follow"]').backgroundColor,followText:css('[data-testid="12-follow"] span').color,following:css('[data-testid="34-unfollow"] span').color,font:css('[data-testid="tweetText"]').fontFamily,size:css('[data-testid="tweetText"]').fontSize,spacer:css('#spacer').height,pad:css('#content').paddingBottom,divider:css('[data-testid="cellInnerDiv"]>div').borderBottomColor,name:css('#name').color,imports:[...document.querySelectorAll('style')].some(s=>s.textContent.includes('@import'))};});
 assert.equal(styles.follow,'rgb(215, 153, 33)');assert.equal(styles.followText,'rgb(0, 0, 0)');assert.equal(styles.following,'rgb(215, 153, 33)');
 assert.match(styles.font,/Georgia/);assert.equal(styles.size,'19.2px');assert.equal(styles.spacer,'4px');assert.equal(styles.pad,'4px');assert.equal(styles.divider,'rgba(0, 0, 0, 0)');
 assert.equal(styles.name,'rgb(1, 2, 3)');assert.equal(styles.imports,false,'@import must be stripped');
 // Turning the option or the extension off restores the original text and styles.
 await page.evaluate(()=>window.changed({plainText:{newValue:false}},'local'));
 assert.equal(await text.first().textContent(),'𝐀𝐠𝐚𝐢𝐧');
 await page.evaluate(()=>window.changed({enabled:{newValue:false}},'local'));
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('[data-testid="12-follow"]')).backgroundColor),'rgb(239, 239, 239)','Chromium default button fill returns');
 assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-xtrim-follow')),false);
 await browser.close();console.log('PASS plain post text (new, edited and restored), follow colors, font, size, density, dividers, custom CSS and disable cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
