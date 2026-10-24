const defaults = { postBlock:true, geoBlocking:false, geoCountries:"", geoAllowed:"", geoMode:"hide", enabled: true, premium: true, hideRightColumn: false, follow: true, trends: false, floatingGrok: false, floatingMessages: false, twitterLogo: false, settingsShortcut: false, moreOptions: [], added: [], mediaDownloads: true, postAbout: false, profileAbout: false, profileCustomWidth: false, profileWidth: 800, profileFont: "default", profilePostCount: false, profileSquareAvatar: false, profileAvatarBorder: false, profileAvatarBorderColor: "#1DA1F2", customWidths: false, navWidth: 272, feedWidth: 600, rightWidth: 350, hidden: [], siteFont: "default", textSize: 100, density: "default", hideDividers: false, followColors: false, plainText: false, customCss: "", hideForYou: false, stayFollowing: false, followingRecent: false, newPosts: "default", hidePromoted: false, hideSponsored: false, hideAdHashtags: false, hideCounts: false, hideActionBar: false, exactCounts: false, timeFormat: "relative", clock24: false, focusMode: false, writerMode: false, keywordFilters: "", hideNoMedia: false, premiumReplies: false, premiumFeeds: false, filterMode: "hide", fastBlock: false, hidePostGrok: false, usageLimit: false, usageMinutes: 60, mediaPhotos: false, exploreSports: false, exploreNews: false, exploreTrends: false, exploreFollow: false, explorePosts: false, themePreset: "", themeMode: "default", themeCustom: {"background": "#000000", "surface": "#16181C", "text": "#E7E9EA", "muted": "#71767B", "border": "#2F3336", "accent": "#1D9BF0", "tabBackground": "#000000", "tabText": "#71767B", "tabActive": "#E7E9EA", "tabIndicator": "#1D9BF0", "icons": "#E7E9EA", "buttonBackground": "#1D9BF0", "buttonText": "#FFFFFF", "buttonAutoContrast": true, "engagementColors": false, "gradient": false, "gradientEnd": "#15202B", "gradientAngle": 135} };
let settings;
async function save() {
 try { await browser.storage.local.set(settings); document.getElementById('status').textContent = 'Saved. Changes apply on X immediately.'; }
 catch { document.getElementById('status').textContent = 'Could not save settings. Please try again.'; }
}
async function initTabs() {
 const tabs = [...document.querySelectorAll('[role="tab"]')];
 const saved = await browser.storage.local.get({ popupTab: 'trim' });
 function select(tab) {
   for (const other of tabs) {
     const selected = other === tab;
     other.setAttribute('aria-selected', selected); other.tabIndex = selected ? 0 : -1;
     document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
   }
   document.querySelector('main').scrollTop = 0;
 }
 for (const [index, tab] of tabs.entries()) {
   tab.onclick = () => {
     select(tab);
     browser.storage.local.set({ popupTab: tab.dataset.tab }).catch(() => {
       document.getElementById('status').textContent = 'Could not remember the open tab.';
     });
   };
   tab.onkeydown = event => {
     const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
     if (!step) return;
     event.preventDefault();
     const next = tabs[(index + step + tabs.length) % tabs.length];
     next.click(); next.focus();
   };
 }
 select(tabs.find(tab => tab.dataset.tab === saved.popupTab) || tabs[0]);
}
const usabilitySwitches=['hidePromoted','hideSponsored','hideAdHashtags','hideCounts','hideActionBar','hideForYou','stayFollowing','followingRecent','exactCounts','clock24','usageLimit','focusMode','writerMode','fastBlock','hidePostGrok','hideNoMedia','premiumReplies','premiumFeeds','mediaPhotos','exploreSports','exploreNews','exploreTrends','exploreFollow','explorePosts'];
function renderUsability() {
 for(const name of ['newPosts','timeFormat','filterMode'])for(const input of document.querySelectorAll(`input[name="${name}"]`)){input.checked=input.value===settings[name];input.onchange=()=>{settings[name]=input.value;save();};}
 const minutes=document.getElementById('usageMinutes'),minutesValue=document.getElementById('usageMinutes-value');
 minutes.value=settings.usageMinutes;minutesValue.textContent=settings.usageMinutes+' min';
 minutes.oninput=()=>{settings.usageMinutes=Number(minutes.value);minutesValue.textContent=minutes.value+' min';save();};
 browser.storage.local.get({usageToday:{day:'',seconds:0}}).then(({usageToday})=>{
   const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   const used=usageToday.day===day?Math.floor(usageToday.seconds/60):0;
   document.getElementById('usage-today').textContent=settings.usageLimit?`Used today: about ${used} min (updates every minute).`:'Turn the limit on to start counting.';
 });
 // Save filter words shortly after typing stops instead of on every keystroke.
 const words=document.getElementById('keywordFilters');let timer;
 words.value=settings.keywordFilters;
 words.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{settings.keywordFilters=words.value;save();},400);};
}
function renderMaster() {
 document.body.classList.toggle('paused', !settings.enabled);
 document.getElementById('master-text').textContent = settings.enabled ? 'Trimming x.com' : 'Paused. X looks normal.';
}
function switchRow(label, checked, onchange) {
 const row = document.createElement('label'), text = document.createElement('span'), input = document.createElement('input'), track = document.createElement('span');
 row.className = 'row compact'; text.className = 'row-text'; text.textContent = label;
 input.type = 'checkbox'; input.className = 'sr-only'; input.setAttribute('role', 'switch'); input.checked = checked;
 input.onchange = () => onchange(input.checked);
 track.className = 'switch'; track.setAttribute('aria-hidden', 'true');
 row.append(text, input, track); return row;
}
async function init() {
 await initTabs();
 settings = await browser.storage.local.get(defaults);
 for (const name of ['enabled','premium','hideRightColumn','follow','trends','floatingGrok','floatingMessages','twitterLogo','settingsShortcut','customWidths','profileCustomWidth','profilePostCount','profileSquareAvatar','profileAvatarBorder','profileAbout','postAbout','mediaDownloads','geoBlocking','postBlock','plainText','hideDividers','followColors',...usabilitySwitches]) {
   const input = document.getElementById(name); input.checked = settings[name];
   input.onchange = async () => {
     if(input.checked&&['profileAbout','postAbout','geoBlocking'].includes(name)){
       try{
         const allowed=await browser.permissions.request({data_collection:ACCOUNT_DATA_TYPES});
         if(!allowed){input.checked=false;settings[name]=false;await save();document.getElementById('status').textContent='Account details remain off. Consent to send the displayed handle and your X session credentials to X is required.';return;}
       }catch{input.checked=false;document.getElementById('status').textContent='Could not request account-detail consent. Try again.';return;}
     }
     settings[name] = input.checked; renderMaster(); renderWidths(); renderProfile(); save();
   };
 }
 for(const name of ['geoCountries','geoAllowed']){const input=document.getElementById(name);input.value=settings[name];input.onchange=()=>{settings[name]=input.value;save();};}
 for(const input of document.querySelectorAll('input[name="geoMode"]')){input.checked=input.value===settings.geoMode;input.onchange=()=>{settings.geoMode=input.value;save();};}
 let discovered = [];
 try {
   const [tab] = await browser.tabs.query({active:true,currentWindow:true});
   if (tab) discovered = await browser.tabs.sendMessage(tab.id, {type:'navigation'});
   if (discovered.length) await browser.storage.local.set({ navigationCache: discovered });
 } catch { document.getElementById('status').textContent = 'Open or reload X to discover your navigation items.'; }
 if (!discovered.length) {
   const cached = await browser.storage.local.get({ navigationCache: [] });
   discovered = cached.navigationCache;
   document.getElementById('status').textContent = discovered.length
     ? 'Showing navigation from your last X visit. Open X to refresh it.'
     : 'Open or reload X, then reopen this popup to load your navigation.';
 }
 renderMaster();
 renderTheme();
 renderLook();
 renderMore();
 renderWidths();
 renderProfile();
 renderUsability();

 const entries = new Map(discovered.map(item => [/^calls$/i.test(item.label) ? 'Calls' : item.key, item.label]));
 // Keep new rollout items available even when the cached sidebar predates them.
 if(!entries.has('Calls'))entries.set('Calls','Calls');
 if(!entries.has('/i/money'))entries.set('/i/money','Money');
 const container = document.getElementById('navigation'); container.replaceChildren();
 for (const [key,label] of entries) {
   container.append(switchRow(label, !settings.hidden.includes(key), checked => {
     settings.hidden = settings.hidden.filter(value => value !== key);
     if (!checked) settings.hidden.push(key);
     save();
   }));
 }
}
const nativeThemes={default:['X default',['linear-gradient(90deg,#FFFFFF 50%,#000000 50%)','#8B98A5','#536471','#1D9BF0']],dark:['Dark',['#000000','#16181C','#E7E9EA','#1D9BF0']],light:['Light',['#FFFFFF','#EFF3F4','#0F1419','#1D9BF0']]};
function paintPreview(preview,[background,surface,text,accent]) {
 preview.style.background=background;
 const [bar,line,shortLine,dot]=preview.children;
 bar.style.background=surface;line.style.background=shortLine.style.background=text;dot.style.background=accent;
}
function buildThemeChoices() {
 const container=document.getElementById('theme-choices');
 if(container.childElementCount)return;
 const choices=[...Object.entries(nativeThemes).map(([value,[name,colors]])=>[value,name,colors]),
   ...Object.entries(themePresets).map(([id,[name,background,surface,text,,,accent]])=>['preset:'+id,name,[background,surface,text,accent]]),
   ['custom','Custom',null]];
 for(const [value,name,colors] of choices) {
   const card=document.createElement('label'),input=document.createElement('input'),preview=document.createElement('span'),title=document.createElement('span');
   card.className='palette';input.type='radio';input.name='themeMode';input.value=value;input.className='sr-only';
   preview.className='preview';preview.setAttribute('aria-hidden','true');
   for(const part of ['p-surface','p-text','p-text p-short','p-dot']){const el=document.createElement('span');el.className=part;preview.append(el);}
   if(colors)paintPreview(preview,colors);
   title.className='palette-name';title.textContent=name;
   card.append(input,preview,title);container.append(card);
 }
}
function syncThemeChoice() {
 const choice=settings.themeMode==='custom'&&themePresets[settings.themePreset]?'preset:'+settings.themePreset:settings.themeMode;
 for(const input of document.querySelectorAll('input[name="themeMode"]'))input.checked=input.value===choice;
 const custom=settings.themeCustom;
 paintPreview(document.querySelector('input[name="themeMode"][value="custom"]+.preview'),[custom.gradient?`linear-gradient(${custom.gradientAngle??135}deg,${custom.background},${custom.gradientEnd})`:custom.background,custom.surface,custom.text,custom.accent]);
}
function saveTheme() {
 settings.themePreset='';syncThemeChoice();
 return save();
}
function openThemePicker(key,field,swatch) {
 document.querySelectorAll('.theme-picker').forEach(panel=>panel.remove());
 const panel=document.createElement('div');panel.className='theme-picker';
 const initial=normalizeAvatarColor(field.value)||settings.themeCustom[key];
 const channels=[1,3,5].map(offset=>parseInt(initial.slice(offset,offset+2),16));
 const preview=document.createElement('div');preview.className='theme-preview';panel.append(preview);
 const sliders=[];
 function updatePreview() {
   const color='#'+sliders.map(slider=>Number(slider.value).toString(16).padStart(2,'0')).join('').toUpperCase();
   preview.style.backgroundColor=color;preview.textContent=color;
   preview.style.color=channels.reduce((sum,_,i)=>sum+Number(sliders[i].value)*[.2126,.7152,.0722][i],0)>140?'#000':'#fff';
   return color;
 }
 for(const [i,name] of ['Red','Green','Blue'].entries()) {
   const label=document.createElement('label'),slider=document.createElement('input'),value=document.createElement('output');
   slider.type='range';slider.min='0';slider.max='255';slider.step='1';slider.value=channels[i];slider.setAttribute('aria-label',name);
   value.textContent=slider.value;label.append(document.createTextNode(name),slider,value);panel.append(label);sliders.push(slider);
   slider.oninput=()=>{value.textContent=slider.value;updatePreview();};
 }
 const apply=document.createElement('button'),cancel=document.createElement('button'),actions=document.createElement('div');
 apply.type=cancel.type='button';apply.textContent='Apply color';cancel.textContent='Cancel';actions.className='theme-picker-actions';
 apply.onclick=async()=>{
   const color=updatePreview();settings.themeCustom={...settings.themeCustom,[key]:color};field.value=color;swatch.style.backgroundColor=color;
   field.setCustomValidity('');field.removeAttribute('aria-invalid');await saveTheme();panel.remove();swatch.focus();
 };
 cancel.onclick=()=>{panel.remove();swatch.focus();};
 actions.append(apply,cancel);panel.append(actions);swatch.parentElement.after(panel);updatePreview();sliders[0].focus();
}
function renderTheme() {
 document.querySelectorAll('.theme-picker').forEach(panel=>panel.remove());
 const autoContrast=document.getElementById('theme-button-auto');
 autoContrast.checked=settings.themeCustom.buttonAutoContrast!==false;
 autoContrast.onchange=()=>{settings.themeCustom={...settings.themeCustom,buttonAutoContrast:autoContrast.checked};renderTheme();saveTheme();};
 const engagement=document.getElementById('theme-engagement');
 engagement.checked=settings.themeCustom.engagementColors===true;
 engagement.onchange=()=>{settings.themeCustom={...settings.themeCustom,engagementColors:engagement.checked};saveTheme();};
 const gradient=document.getElementById('theme-gradient');
 gradient.checked=!!settings.themeCustom.gradient;
 document.getElementById('theme-gradient-controls').hidden=!gradient.checked;
 gradient.onchange=()=>{settings.themeCustom={...settings.themeCustom,gradient:gradient.checked};renderTheme();saveTheme();};
 const angle=document.getElementById('theme-gradient-angle'),angleValue=document.getElementById('theme-gradient-angle-value');
 angle.value=settings.themeCustom.gradientAngle??135;angleValue.textContent=angle.value+'°';
 angle.oninput=()=>{settings.themeCustom={...settings.themeCustom,gradientAngle:Number(angle.value)};angleValue.textContent=angle.value+'°';saveTheme();};
 buildThemeChoices();syncThemeChoice();
 const custom=document.getElementById('theme-custom');custom.hidden=settings.themeMode!=='custom';
 for(const mode of document.querySelectorAll('input[name="themeMode"]'))mode.onchange=()=>{
   const id=mode.value.startsWith('preset:')?mode.value.slice(7):'';
   const palette=paletteFromPreset(id);
   settings.themePreset=palette?id:'';settings.themeMode=palette?'custom':mode.value;
   if(palette)settings.themeCustom={...palette,engagementColors:settings.themeCustom.engagementColors===true};
   renderTheme();save();
 };
 for(const key of ['background','gradientEnd','surface','text','muted','border','accent','icons','buttonBackground','buttonText','tabBackground','tabText','tabActive','tabIndicator']) {
   const field=document.getElementById('theme-'+key),picker=document.getElementById('theme-'+key+'-picker');
   const value=normalizeAvatarColor(settings.themeCustom[key]||defaults.themeCustom[key])||'#000000';field.value=value;picker.style.backgroundColor=value;
   field.oninput=()=>{const next=normalizeAvatarColor(field.value);field.setCustomValidity(next?'':'Enter a valid hex color.');field.setAttribute('aria-invalid',next?'false':'true');if(next){settings.themeCustom={...settings.themeCustom,[key]:next};picker.style.backgroundColor=next;saveTheme();}};
   field.onchange=()=>{if(field.reportValidity())field.value=settings.themeCustom[key];};
   field.disabled=picker.disabled=key==='buttonText'&&autoContrast.checked;
   picker.onclick=()=>openThemePicker(key,field,picker);
 }
}
const lookDefaults={siteFont:'default',textSize:100,density:'default',hideDividers:false,followColors:false,plainText:false};
function renderLook() {
 for(const name of ['siteFont','density'])for(const input of document.querySelectorAll(`input[name="${name}"]`)){input.checked=input.value===settings[name];input.onchange=()=>{settings[name]=input.value;save();};}
 for(const name of ['hideDividers','followColors','plainText'])document.getElementById(name).checked=settings[name];
 const size=document.getElementById('textSize'),sizeValue=document.getElementById('textSize-value');
 size.value=settings.textSize;sizeValue.textContent=settings.textSize+'%';
 size.oninput=()=>{settings.textSize=Number(size.value);sizeValue.textContent=size.value+'%';save();};
 // Save pasted CSS shortly after typing stops instead of on every keystroke.
 const css=document.getElementById('customCss');let timer;
 css.value=settings.customCss;
 css.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{settings.customCss=css.value;save();},400);};
}
document.getElementById('reset-theme').onclick=()=>{settings.themePreset='';settings.themeMode='default';settings.themeCustom={...defaults.themeCustom};Object.assign(settings,lookDefaults);renderTheme();renderLook();save();};
function normalizeAvatarColor(value) {
 const hex = value.trim().replace(/^#/, '');
 if (/^[0-9a-f]{3}$/i.test(hex)) return '#' + [...hex].map(c => c + c).join('').toUpperCase();
 if (/^[0-9a-f]{6}$/i.test(hex)) return '#' + hex.toUpperCase();
 return null;
}
function renderProfile() {
 const slider = document.getElementById('profileWidth');
 slider.value = settings.profileWidth; slider.disabled = !settings.profileCustomWidth;
 const output = document.getElementById('profileWidth-value'); output.textContent = settings.profileWidth + ' px';
 slider.oninput = () => { settings.profileWidth = Number(slider.value); output.textContent = settings.profileWidth + ' px'; save(); };
 for (const font of document.querySelectorAll('input[name="profileFont"]')) {
   font.checked = font.value === settings.profileFont;
   font.onchange = () => { settings.profileFont = font.value; save(); };
 }
}
document.getElementById('reset-profile').onclick = () => {
 Object.assign(settings, {profileAbout:false,profileCustomWidth:false,profileWidth:800,profileFont:'default',profilePostCount:false,profileSquareAvatar:false,profileAvatarBorder:false,profileAvatarBorderColor:'#1DA1F2'});
 for (const name of ['profileCustomWidth','profilePostCount','profileSquareAvatar','profileAvatarBorder','profileAbout']) document.getElementById(name).checked = settings[name];
 renderProfile(); save();
};
function renderWidths() {
 document.getElementById('schematic').classList.toggle('off', !settings.customWidths);
 for (const name of ['navWidth','feedWidth','rightWidth']) {
   const slider = document.getElementById(name);
   slider.value = settings[name];
   slider.disabled = !settings.customWidths;
   const paint = () => {
     document.getElementById(name + '-value').textContent = settings[name] + ' px';
     document.getElementById(name + '-number').textContent = settings[name];
     document.getElementById(name + '-column').style.flexGrow = settings[name];
   };
   paint();
   slider.oninput = () => {
     settings[name] = Number(slider.value);
     paint();
     save();
   };
 }
}
document.getElementById('reset-widths').onclick = () => {
 Object.assign(settings, { customWidths: false, navWidth: 272, feedWidth: 600, rightWidth: 350 });
 document.getElementById('customWidths').checked = false;
 renderWidths(); save();
};
function renderMore() {
 const container = document.getElementById('more-options'); container.replaceChildren();
 if (!settings.moreOptions.length) container.textContent = 'No menu links discovered yet.';
 for (const item of settings.moreOptions) {
   container.append(switchRow(item.label, settings.added.includes(item.key), checked => {
     settings.added = settings.added.filter(key => key !== item.key);
     if (checked) settings.added.push(item.key);
     save();
   }));
 }
}
document.getElementById('read-more').onclick = async () => {
 try {
   const [tab] = await browser.tabs.query({active:true,currentWindow:true});
   settings.moreOptions = await browser.tabs.sendMessage(tab.id, {type:'more-options'});
   renderMore();
   document.getElementById('status').textContent = settings.moreOptions.length ? 'Menu links loaded. Check the ones to add.' : 'Open More on X first, then reopen this popup.';
 } catch { document.getElementById('status').textContent = 'Open or reload X first.'; }
};
document.getElementById('reset').onclick = async () => { await browser.storage.local.set(defaults); await init(); };
init();
