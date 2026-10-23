"""Build deterministic unsigned extension and source archives; no JS build step."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=['block-state.js','post-block.js','post-block.css','geo-timeline.js','geo-timeline.css','manifest.json','page-route.js','content.js','about-profile.js','about-profile.css','about-background.js','data-consent.js','theme.js','theme-extras.js','usability.js','usability.css','usability-background.js','theme-presets.js','early-layout.css','media-background.js','media-download.js','media-download.css','media-gif.js','media-permissions.js','gif-background.js','gif-converter.html','gif-converter.js','gif-converter.css','popup.html','popup.js','popup.css','LICENSE','THIRD_PARTY_NOTICES.txt','PRIVACY.md','vendor/gif.js/LICENSE','vendor/gif.js/dist/gif.js','vendor/gif.js/dist/gif.worker.js']
def write_archive(name,files):
 with zipfile.ZipFile(ROOT/name,'w',zipfile.ZIP_DEFLATED) as archive:
  for name in sorted(set(files)):
   info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
   archive.writestr(info,(ROOT/name).read_bytes())
for name in ['x-trim.xpi','x-trim.zip']:write_archive(name,RUNTIME)
source=RUNTIME+['README.md']
for directory in ['scripts','tests','review','vendor']:
 source += [str(p.relative_to(ROOT)) for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in str(p) and p.name!='.DS_Store']
write_archive('x-trim-source.zip',source)
print('Built unsigned XPI, ZIP and source archive.')
