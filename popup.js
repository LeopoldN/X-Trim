const defaults = { postBlock:true, geoBlocking:false, geoCountries:"", geoAllowed:"", geoMode:"hide", enabled: true, premium: true, hideRightColumn: false, follow: true, trends: false, floatingGrok: false, floatingMessages: false, twitterLogo: false, settingsShortcut: false, moreOptions: [], added: [], mediaDownloads: true, postAbout: false, profileAbout: false, profileCustomWidth: false, profileWidth: 800, profileFont: "default", profilePostCount: false, profileSquareAvatar: false, profileAvatarBorder: false, profileAvatarBorderColor: "#1DA1F2", customWidths: false, navWidth: 272, feedWidth: 600, rightWidth: 350, hidden: [], themePreset: "", themeMode: "default", themeCustom: {"background": "#000000", "surface": "#16181C", "text": "#E7E9EA", "muted": "#71767B", "border": "#2F3336", "accent": "#1D9BF0", "tabBackground": "#000000", "tabText": "#71767B", "tabActive": "#E7E9EA", "tabIndicator": "#1D9BF0", "icons": "#E7E9EA", "buttonBackground": "#1D9BF0", "buttonText": "#FFFFFF", "buttonAutoContrast": true, "engagementColors": false, "gradient": false, "gradientEnd": "#15202B", "gradientAngle": 135} };
let settings;
async function save() {
 try { await browser.storage.local.set(settings); document.getElementById('status').textContent = 'Saved. Changes apply on X immediately.'; }
 catch { document.getElementById('status').textContent = 'Could not save settings. Please try again.'; }
}
async function initSections() {
 const sections = [...document.querySelectorAll('details[data-section]')];
 const defaults = Object.fromEntries(sections.map(section => ['sectionOpen_' + section.dataset.section, false]));
 const saved = await browser.storage.local.get(defaults);
 for (const section of sections) {
   const key = 'sectionOpen_' + section.dataset.section;
   section.open = !!saved[key];
   section.ontoggle = () => {
     browser.storage.local.set({ [key]: section.open }).catch(() => {
       document.getElementById('status').textContent = 'Could not remember the section state.';
     });
   };
 }
}
async function init() {
 await initSections();
 settings = await browser.storage.local.get(defaults);
 for (const name of ['enabled','premium','hideRightColumn','follow','trends','floatingGrok','floatingMessages','twitterLogo','settingsShortcut','customWidths','profileCustomWidth','profilePostCount','profileSquareAvatar','profileAvatarBorder','profileAbout','postAbout','mediaDownloads','geoBlocking','postBlock']) {
   const input = document.getElementById(name); input.checked = settings[name];
   input.onchange = async () => {
     if(input.checked&&['profileAbout','postAbout','geoBlocking'].includes(name)){
       try{
         const allowed=await browser.permissions.request({data_collection:ACCOUNT_DATA_TYPES});
         if(!allowed){input.checked=false;settings[name]=false;await save();document.getElementById('status').textContent='Account details remain off. Consent to send the displayed handle and your X session credentials to X is required.';return;}
       }catch{input.checked=false;document.getElementById('status').textContent='Could not request account-detail consent. Try again.';return;}
     }
     settings[name] = input.checked; renderWidths(); renderProfile(); save();
   };
 }
 for(const name of ['geoCountries','geoAllowed','geoMode']){const input=document.getElementById(name);input.value=settings[name];input.onchange=()=>{settings[name]=input.value;save();};}
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
 renderTheme();
 renderMore();
 renderWidths();
 renderProfile();

 const entries = new Map(discovered.map(item => [/^calls$/i.test(item.label) ? 'Calls' : item.key, item.label]));
 // Keep new rollout items available even when the cached sidebar predates them.
 if(!entries.has('Calls'))entries.set('Calls','Calls');
 const container = document.getElementById('navigation'); container.replaceChildren();
 for (const [key,label] of entries) {
   const row = document.createElement('label'), input = document.createElement('input');
   input.type = 'checkbox'; input.checked = !settings.hidden.includes(key);
   input.onchange = () => {
     settings.hidden = settings.hidden.filter(value => value !== key);
     if (!input.checked) settings.hidden.push(key);
     save();
   };
   row.append(input,document.createTextNode(label)); container.append(row);
 }
}
function saveTheme() {
 settings.themePreset='';document.getElementById('themeMode').value=settings.themeMode;
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
 const mode=document.getElementById('themeMode');mode.value=settings.themeMode==='custom'&&themePresets[settings.themePreset]?'preset:'+settings.themePreset:settings.themeMode;
 const custom=document.getElementById('theme-custom');custom.hidden=settings.themeMode!=='custom';
 mode.onchange=()=>{
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
document.getElementById('reset-theme').onclick=()=>{settings.themePreset='';settings.themeMode='default';settings.themeCustom={...defaults.themeCustom};renderTheme();save();};
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
 const font = document.getElementById('profileFont'); font.value = settings.profileFont;
 font.onchange = () => { settings.profileFont = font.value; save(); };
}
document.getElementById('reset-profile').onclick = () => {
 Object.assign(settings, {profileAbout:false,profileCustomWidth:false,profileWidth:800,profileFont:'default',profilePostCount:false,profileSquareAvatar:false,profileAvatarBorder:false,profileAvatarBorderColor:'#1DA1F2'});
 for (const name of ['profileCustomWidth','profilePostCount','profileSquareAvatar','profileAvatarBorder','profileAbout']) document.getElementById(name).checked = settings[name];
 renderProfile(); save();
};
function renderWidths() {
 for (const name of ['navWidth','feedWidth','rightWidth']) {
   const slider = document.getElementById(name);
   slider.value = settings[name];
   slider.disabled = !settings.customWidths;
   document.getElementById(name + '-value').textContent = settings[name] + ' px';
   slider.oninput = () => {
     settings[name] = Number(slider.value);
     document.getElementById(name + '-value').textContent = settings[name] + ' px';
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
   const row = document.createElement('label'), input = document.createElement('input');
   input.type = 'checkbox'; input.checked = settings.added.includes(item.key);
   input.onchange = () => {
     settings.added = settings.added.filter(key => key !== item.key);
     if (input.checked) settings.added.push(item.key);
     save();
   };
   row.append(input, document.createTextNode(item.label)); container.append(row);
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
