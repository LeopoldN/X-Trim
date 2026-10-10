import http.server,threading,subprocess,tempfile,json,queue,socket,time,shutil,sys
import argparse
parser=argparse.ArgumentParser();parser.add_argument("--browser",required=True);parser.add_argument("--fixture",required=True);args=parser.parse_args()
from pathlib import Path
result=queue.Queue()
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  self.send_response(200);self.end_headers();self.wfile.write(Path(args.fixture).read_bytes())
 def do_POST(self):
  result.put(self.rfile.read(int(self.headers['Content-Length'])).decode());self.send_response(200);self.end_headers()
server=http.server.HTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
origin='http://127.0.0.1:'+str(server.server_port)
with tempfile.TemporaryDirectory(prefix='xtrim-zen-extension-') as base:
 base=Path(base);profile=base/'profile';profile.mkdir();ext=base/'extension';ext.mkdir();
 import zipfile
 with zipfile.ZipFile('x-trim.xpi') as archive:archive.extractall(ext)
 m=json.loads((ext/'manifest.json').read_text())
 # Test-only grants/local fixture endpoint; shipped runtime scripts remain unchanged.
 m['host_permissions']+=['http://127.0.0.1/*','https://video.twimg.com/*']
 m['browser_specific_settings']['gecko']['data_collection_permissions']={'required':['websiteContent','browsingActivity','authenticationInfo']}
 m['background']['scripts'].append('test.js')
 m['content_security_policy']['extension_pages']=m['content_security_policy']['extension_pages'].replace("connect-src 'self'", "connect-src 'self' blob: http://127.0.0.1:"+str(server.server_port))
 (ext/'manifest.json').write_text(json.dumps(m));(ext/'test.js').write_text("""(async()=>{let output;try{const sourceTab=await browser.tabs.create({url:'about:blank'});const converted=await startGifConversion('ORIGIN/video',sourceTab.id,'test');const blob=await(await fetch(converted.objectURL)).blob();const header=await blob.slice(0,6).text();const id=await browser.downloads.download({url:converted.objectURL,filename:'xtrim-test.gif',saveAs:false});let state;for(let i=0;i<100;i++){state=(await browser.downloads.search({id}))[0];if(state.state!=='in_progress')break;await new Promise(r=>setTimeout(r,100));}output={ok:true,size:blob.size,header,download:state.state};await browser.tabs.remove(converted.conversionTabId);const sourceId=sourceTab.id;const cancelled=startGifConversion('ORIGIN/video',sourceId,'cancel').then(()=>({cancelled:false}),error=>({cancelled:/closed/.test(error.message)}));for(let attempt=0;attempt<100;attempt++){const job=[...gifConversions.values()][0];if(job?.tabId){await browser.tabs.remove(job.tabId);break;}await new Promise(r=>setTimeout(r,20));}output.cancel=(await cancelled).cancelled;await browser.tabs.remove(sourceId);}catch(e){output={error:e.message,stack:e.stack};}await fetch('ORIGIN/result',{method:'POST',body:JSON.stringify(output)});})();""".replace('ORIGIN',origin))
 (profile/'user.js').write_text('user_pref("browser.download.folderList", 2);\nuser_pref("browser.download.dir", '+json.dumps(str(profile))+');\n'+'user_pref("marionette.port", 2839);\nuser_pref("browser.shell.checkDefaultBrowser", false);')
 proc=subprocess.Popen([args.browser,'--headless','--no-remote','--marionette','--profile',str(profile)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for i in range(100):
   try:sock=socket.create_connection(('127.0.0.1',2839),timeout=1);break
   except OSError:time.sleep(.2)
  sock.settimeout(30)
  def receive():
   length=b''
   while not length.endswith(b':'):length+=sock.recv(1)
   remaining=int(length[:-1]);data=b''
   while len(data)<remaining:data+=sock.recv(remaining-len(data))
   return json.loads(data)
  print('Handshake',receive(),flush=True)
  def command(i,name,args):
   data=json.dumps([0,i,name,args]).encode();sock.sendall(str(len(data)).encode()+b':'+data);reply=receive();print(name,reply,flush=True);assert not reply[2]
  command(1,'WebDriver:NewSession',{'capabilities':{'alwaysMatch':{'acceptInsecureCerts':True}}})
  command(2,'Addon:Install',{'path':str(ext),'temporary':True})
  output=json.loads(result.get(timeout=60));print('RESULT',json.dumps(output),flush=True);assert output.get('ok') and output.get('header')=='GIF89a' and output.get('download')=='complete' and output.get('cancel'),output
 finally:proc.terminate();proc.wait(timeout=10);server.shutdown()
