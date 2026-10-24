"""Build deterministic unsigned extension and source archives; no JS build step.

Firefox: x-trim.xpi and x-trim.zip use manifest.json and the files below unchanged.
Chrome: x-trim-chrome.zip uses chrome/manifest.json as its manifest.json, adds the
chrome/ files and swaps a few Firefox-specific words, in the archive only.
"""
from pathlib import Path
import json,zipfile
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
RUNTIME=['manifest.json','icons/x-trim.svg','LICENSE','THIRD_PARTY_NOTICES.txt','PRIVACY.md',
 'content/page-route.js','content/layout.js','content/layout-early.css','content/account-details.js','content/account-details.css','content/theme.js','content/theme-extras.js','content/media-download.js','content/media-download.css','content/geo-timeline.js','content/geo-timeline.css','content/post-block.js','content/post-block.css','content/usability.js','content/usability.css','content/explore.js','content/explore.css',
 'background/account-details.js','background/gif-conversion.js','background/post-block.js','background/usability.js','background/media-download.js',
 'shared/data-consent.js',
 'popup/popup.html','popup/popup.js','popup/popup.css','popup/theme-presets.js','popup/media-permissions.js',
 'gif-converter/gif-converter.html','gif-converter/gif-converter.js','gif-converter/gif-converter.css','gif-converter/mp4-to-gif.js',
 'vendor/gif.js/LICENSE','vendor/gif.js/dist/gif.js','vendor/gif.js/dist/gif.worker.js']
CHROME_ONLY=['chrome/browser-compat.js','chrome/service-worker.js','chrome/page-hook.js','chrome/page-bridge.js','chrome/page-responses.js',
 'chrome/icons/icon-16.png','chrome/icons/icon-32.png','chrome/icons/icon-48.png','chrome/icons/icon-128.png']
# Firefox uses an SVG icon; Chrome needs the PNGs in chrome/icons.
FIREFOX_ONLY=['manifest.json','icons/x-trim.svg']
COMPAT_SCRIPT='<script src="../chrome/browser-compat.js"></script>'
# Each Firefox phrase must appear exactly once, so a reworded popup fails the build.
CHROME_WORDING={
 'popup/popup.html':[('change the keys in Firefox › Add-ons › Manage Extension Shortcuts.','change the keys at chrome://extensions/shortcuts.'),
  ('Firefox asks for consent first.','Turning it on records your consent.'),
  ('Firefox asks for consent.','Turning it on records your consent.')],
 'content/media-download.js':[('Check Firefox downloads.','Check Chrome downloads.')],
 'gif-converter/mp4-to-gif.js':[('Firefox provided no decoder details.','Chrome provided no decoder details.')]}
def write_archive(name,files,overrides={}):
 DIST.mkdir(exist_ok=True)
 with zipfile.ZipFile(DIST/name,'w',zipfile.ZIP_DEFLATED) as archive:
  for name in sorted(set(files)|set(overrides)):
   info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
   archive.writestr(info,overrides[name] if name in overrides else (ROOT/name).read_bytes())
def chrome_manifest():
 firefox=json.loads((ROOT/'manifest.json').read_text());chrome=json.loads((ROOT/'chrome/manifest.json').read_text())
 for key in ['name','version','description','host_permissions','optional_host_permissions','commands','content_security_policy']:
  assert chrome[key]==firefox[key],f'chrome/manifest.json {key} differs from manifest.json'
 ff,cr=firefox['content_scripts'][0],chrome['content_scripts'][0]
 assert cr['js']==['chrome/browser-compat.js']+ff['js']+['chrome/page-bridge.js'],'chrome/manifest.json content scripts differ from manifest.json'
 assert cr['css']==ff['css'] and cr['matches']==ff['matches'],'chrome/manifest.json content CSS or matches differ from manifest.json'
 worker=(ROOT/'chrome/service-worker.js').read_text()
 assert all(f"'/{script}'" in worker for script in firefox['background']['scripts']),'chrome/service-worker.js is missing a background script'
 return json.dumps(chrome,indent=2,ensure_ascii=True).encode()+b'\n'
def chrome_overrides():
 overrides={'manifest.json':chrome_manifest()}
 for name,swaps in CHROME_WORDING.items():
  text=(ROOT/name).read_text()
  for old,new in swaps:
   assert text.count(old)==1,f'{name}: expected one "{old}"'
   text=text.replace(old,new)
  overrides[name]=text.encode()
 for name in ['popup/popup.html','gif-converter/gif-converter.html']:
  text=overrides[name].decode() if name in overrides else (ROOT/name).read_text()
  first=text.index('<script ')
  overrides[name]=(text[:first]+COMPAT_SCRIPT+text[first:]).encode()
 return overrides
for name in ['x-trim.xpi','x-trim.zip']:write_archive(name,RUNTIME)
write_archive('x-trim-chrome.zip',[name for name in RUNTIME if name not in FIREFOX_ONLY]+CHROME_ONLY,chrome_overrides())
source=RUNTIME+['README.md']
for directory in ['chrome','scripts','tests','review','vendor']:
 source += [str(p.relative_to(ROOT)) for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in str(p) and p.name!='.DS_Store']
write_archive('x-trim-source.zip',source)
print('Built unsigned Firefox XPI and ZIP, Chrome Web Store ZIP and source archive in dist/.')
