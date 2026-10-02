"""Probe actual Chromium tab capture, without synthetic getUserMedia replacements."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
from playwright.sync_api import sync_playwright
with TemporaryDirectory() as temp,sync_playwright() as pw:
 root=Path(temp);ext=root/'extension';ext.mkdir()
 (ext/'manifest.json').write_text(json.dumps({'manifest_version':3,'name':'Capture probe','version':'1','permissions':['tabCapture','tabs','offscreen'],'background':{'service_worker':'worker.js'}}))
 (ext/'worker.js').write_text('chrome.runtime.onInstalled.addListener(()=>{});')
 (ext/'offscreen.html').write_text('<script src="offscreen.js"></script>')
 (ext/'offscreen.js').write_text('''let media;chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.type==='start'){navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:m.id}},video:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:m.id,maxWidth:1920,maxHeight:1080,maxFrameRate:15}}}).then(stream=>{media=stream;reply({ok:true,tracks:stream.getTracks().map(t=>({kind:t.kind,state:t.readyState}))});}).catch(e=>reply({ok:false,error:String(e)}));return true;}if(m.type==='stop'){media.getTracks().forEach(t=>t.stop());reply({ok:true});}if(m.type==='status')reply(media.getTracks().map(t=>({kind:t.kind,state:t.readyState})));});''')
 args=[f'--disable-extensions-except={ext}',f'--load-extension={ext}','--autoplay-policy=no-user-gesture-required']
 c=pw.chromium.launch_persistent_context(str(root/'discover'),channel='chromium',headless=True,args=args)
 w=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker');eid=w.url.split('/')[2];c.close()
 # Bypass only toolbar invocation in the isolated test, not media APIs.
 c=pw.chromium.launch_persistent_context(str(root/'verify'),channel='chromium',headless=True,args=args+[f'--allowlisted-extension-id={eid}'])
 try:
  w=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker')
  p=c.new_page();p.route('https://meet.google.com/probe',lambda r:r.fulfill(content_type='text/html',body='<h1>Fixture meeting</h1>'));p.goto('https://meet.google.com/probe')
  p.evaluate('''() => {const ctx=new AudioContext();const tone=ctx.createOscillator();tone.connect(ctx.destination);tone.start();}''')
  result=w.evaluate('''async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Test capture'});const id=await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});return chrome.runtime.sendMessage({type:'start',id});}''')
  assert result.get('ok'),result
  assert {t['kind'] for t in result['tracks']}=={'audio','video'},result
  other=c.new_page();other.goto('about:blank');other.bring_to_front();p.wait_for_timeout(1200)
  tracks=w.evaluate("chrome.runtime.sendMessage({type:'status'})")
  assert all(t['state']=='live' for t in tracks),tracks
  w.evaluate("chrome.runtime.sendMessage({type:'stop'})")
  print('PASS: actual tabCapture stream ID consumed by actual offscreen getUserMedia; audio/video stay live across tab switch')
 finally:c.close()
