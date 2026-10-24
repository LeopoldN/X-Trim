"""Build deterministic unsigned extension and source archives; no JS build step."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
RUNTIME=['manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','PRIVACY.md',
 'content/page-route.js','content/layout.js','content/layout-early.css','content/account-details.js','content/account-details.css','content/theme.js','content/theme-extras.js','content/media-download.js','content/media-download.css','content/geo-timeline.js','content/geo-timeline.css','content/post-block.js','content/post-block.css','content/usability.js','content/usability.css',
 'background/account-details.js','background/gif-conversion.js','background/post-block.js','background/usability.js','background/media-download.js',
 'shared/data-consent.js',
 'popup/popup.html','popup/popup.js','popup/popup.css','popup/theme-presets.js','popup/media-permissions.js',
 'gif-converter/gif-converter.html','gif-converter/gif-converter.js','gif-converter/gif-converter.css','gif-converter/mp4-to-gif.js',
 'vendor/gif.js/LICENSE','vendor/gif.js/dist/gif.js','vendor/gif.js/dist/gif.worker.js']
def write_archive(name,files):
 DIST.mkdir(exist_ok=True)
 with zipfile.ZipFile(DIST/name,'w',zipfile.ZIP_DEFLATED) as archive:
  for name in sorted(set(files)):
   info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
   archive.writestr(info,(ROOT/name).read_bytes())
for name in ['x-trim.xpi','x-trim.zip']:write_archive(name,RUNTIME)
source=RUNTIME+['README.md']
for directory in ['scripts','tests','review','vendor']:
 source += [str(p.relative_to(ROOT)) for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in str(p) and p.name!='.DS_Store']
write_archive('x-trim-source.zip',source)
print('Built unsigned XPI, ZIP and source archive in dist/.')
