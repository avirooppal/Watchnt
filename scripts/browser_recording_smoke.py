"""Production browser capture: real tabCapture, offscreen media, WebRTC and Whisper.
Only the toolbar grant, microphone device, presentation provider and storage API
are fixtures; no capture/recording/transcription implementation is replaced.
"""
import base64,json,time
from pathlib import Path
from tempfile import TemporaryDirectory
from email.parser import BytesParser
from email.policy import default
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
audio=Path.home()/'AppData/Local/Temp/watchnt-audio-verification'
with TemporaryDirectory() as temp,sync_playwright() as pw:
 args=[f'--disable-extensions-except={root/"extension/dist"}',f'--load-extension={root/"extension/dist"}','--autoplay-policy=no-user-gesture-required']
 c=pw.chromium.launch_persistent_context(str(Path(temp)/'discover'),channel='chromium',headless=True,args=args)
 w=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker');eid=w.url.split('/')[2];c.close()
 c=pw.chromium.launch_persistent_context(str(Path(temp)/'record'),channel='chromium',headless=True,args=args+[f'--allowlisted-extension-id={eid}'])
 try:
  chunks=[];calls=[];errors=[]
  def api(route):
   req=route.request;path=req.url.removeprefix('http://localhost:8000');calls.append(path)
   if '/recording/chunks/' in path:
    body=b'Content-Type: '+req.headers['content-type'].encode()+b'\r\n\r\n'+req.post_data_buffer
    chunks.append(next(BytesParser(policy=default).parsebytes(body).iter_parts()).get_payload(decode=True))
   result={'id':'browser-fixture'} if path=='/meeting' else {'video':True} if path=='/recording/capabilities' else {'status':'COMPLETED'}
   route.fulfill(content_type='application/json',body=json.dumps(result))
  c.route('http://localhost:8000/**',api)
  clips={key:base64.b64encode((audio/(key+'.wav')).read_bytes()).decode() for key in ['meeting','microphone']}
  c.add_init_script("""if(location.hostname==='meet.google.com') {
   const clips="""+json.dumps(clips)+""";
   const create=async name=>{
    const ctx=new AudioContext();await ctx.resume();const source=ctx.createBufferSource();
    source.buffer=await ctx.decodeAudioData(Uint8Array.from(atob(clips[name]),c=>c.charCodeAt(0)).buffer);
    source.loop=true;const output=ctx.createMediaStreamDestination();source.connect(output);source.start();return output.stream;
   };
   navigator.mediaDevices.getDisplayMedia=async()=>{window.presentationFixture=await create('meeting');return presentationFixture;};
   navigator.mediaDevices.getUserMedia=()=>create('microphone');
  }""")
  w=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker')
  p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  p.route('https://meet.google.com/browser-fixture',lambda r:r.fulfill(content_type='text/html',body='<title>Fixture meeting</title><h1>Shared presentation</h1><button aria-label="Leave call">Leave</button>'))
  p.goto('https://meet.google.com/browser-fixture');p.wait_for_timeout(1200);assert p.locator('#watchnt-reminder').count()==0
  p.evaluate('navigator.mediaDevices.getDisplayMedia({audio:true,video:true})')
  w.evaluate("chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Production capture test'})")
  cdp=c.browser.new_browser_cdp_session()
  target=next(t for t in cdp.send('Target.getTargets')['targetInfos'] if t['url'].endswith('/offscreen.html'))
  sid=cdp.send('Target.attachToTarget',{'targetId':target['targetId'],'flatten':False})['sessionId']
  responses={};counter=0
  cdp.on('Target.receivedMessageFromTarget',lambda event:responses.update({json.loads(event['message']).get('id'):json.loads(event['message'])}))
  def offscreen(expression):
   key=len(responses)+1
   while key in responses:key+=1
   cdp.send('Target.sendMessageToTarget',{'sessionId':sid,'message':json.dumps({'id':key,'method':'Runtime.evaluate','params':{'expression':expression,'awaitPromise':True,'returnByValue':True}})})
   deadline=time.monotonic()+20
   while key not in responses and time.monotonic()<deadline:p.wait_for_timeout(50)
   result=responses[key]['result']
   assert 'exceptionDetails' not in result,result
   return result.get('result',{}).get('value')
  offscreen("""window.fixtureCalls=[];window.fixtureChunks=[];window.fixturePeers=[];window.fixtureContexts=[];
   const PC=RTCPeerConnection;window.RTCPeerConnection=class extends PC {constructor(...a){super(...a);fixturePeers.push(this);}};
   const AC=AudioContext;window.AudioContext=class extends AC {constructor(...a){super(...a);fixtureContexts.push(this);}};
   const realFetch=fetch;window.fetch=async(url,options={})=>{
    if(!String(url).startsWith('http://localhost:8000/'))return realFetch(url,options);
    const path=String(url).replace('http://localhost:8000','');fixtureCalls.push(path);
    if(path.includes('/recording/chunks/'))fixtureChunks.push([...new Uint8Array(await options.body.get('file').arrayBuffer())]);
    return new Response(JSON.stringify(path==='/meeting'?{id:'browser-fixture'}:{status:'COMPLETED'}),{headers:{'Content-Type':'application/json'}});
   };""")
  popup=c.new_page();popup.goto(f'chrome-extension://{eid}/index.html');p.bring_to_front()
  popup.evaluate("chrome.runtime.sendMessage({type:'START_RECORDING_WITH_STREAM'})")
  state=w.evaluate('chrome.storage.local.get(null)')
  assert state.get('isRecording'),state
  assert state['captureMode']=='browser',state
  assert all('capture-start.html' not in page.url for page in c.pages)
  other=c.new_page();other.goto('about:blank');other.bring_to_front()
  deadline=time.monotonic()+75
  while time.monotonic()<deadline:
   state=w.evaluate('chrome.storage.local.get(null)')
   assert state.get('isRecording'),state
   segments=state.get('recoveryTranscript',[])
   meeting=' '.join(s['text'] for s in segments if s['speaker']=='Others').lower()
   me=' '.join(s['text'] for s in segments if s['speaker']=='Me').lower()
   if 'budget' in meeting and 'friday' in meeting and 'presentation' in me and 'report' in me:break
   p.wait_for_timeout(500)
  else:raise AssertionError({'meeting':meeting,'me':me,'state':state})
  chunks=offscreen('fixtureChunks');calls=offscreen('fixtureCalls');assert chunks and '/upload_transcript' not in calls
  popup.evaluate("chrome.runtime.sendMessage({type:'STOP_RECORDING'})")
  deadline=time.monotonic()+20
  while time.monotonic()<deadline:
   state=w.evaluate('chrome.storage.local.get(null)')
   if state.get('pipelineStatus') in ('COMPLETED','FAILED'):break
   p.wait_for_timeout(200)
  assert state['pipelineStatus']=='COMPLETED',state
  calls=offscreen('fixtureCalls');assert calls.index('/meeting/browser-fixture/recording/complete')<calls.index('/upload_transcript')
  assert bytes(chunks[0]).startswith(b'\x1a\x45\xdf\xa3')
  dimensions=popup.evaluate("""async bytes=>{
   const video=document.createElement('video');video.muted=true;
   const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/webm'}));video.src=url;
   await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;});
   const dimensions=[video.videoWidth,video.videoHeight];URL.revokeObjectURL(url);return dimensions;
  }""",[value for chunk in chunks for value in chunk])
  assert dimensions[0]>0 and dimensions[1]>0,dimensions
  assert p.evaluate('presentationFixture.getAudioTracks()[0].readyState')=='live','Stop must not stop meeting presentation'
  assert offscreen('fixturePeers.every(p=>p.connectionState==="closed")')
  # Record again, adding a new presentation after recording has started.
  p.evaluate('presentationFixture.getTracks().forEach(t=>t.stop())')
  p.bring_to_front()
  popup.evaluate("chrome.runtime.sendMessage({type:'START_RECORDING_WITH_STREAM'})")
  state=w.evaluate('chrome.storage.local.get(null)');assert state.get('isRecording'),state
  p.evaluate('navigator.mediaDevices.getDisplayMedia({audio:true,video:true})')
  other.bring_to_front()
  deadline=time.monotonic()+60
  while time.monotonic()<deadline:
   state=w.evaluate('chrome.storage.local.get(null)');assert state.get('isRecording'),state
   segments=state.get('recoveryTranscript',[])
   if any('budget' in s['text'].lower() and s['speaker']=='Others' for s in segments):break
   p.wait_for_timeout(500)
  else:raise AssertionError(state)
  popup.evaluate("chrome.runtime.sendMessage({type:'STOP_RECORDING'})")
  deadline=time.monotonic()+20
  while time.monotonic()<deadline:
   state=w.evaluate('chrome.storage.local.get(null)')
   if state.get('pipelineStatus') in ('COMPLETED','FAILED'):break
   p.wait_for_timeout(200)
  assert state['pipelineStatus']=='COMPLETED',state
  assert p.evaluate('presentationFixture.getAudioTracks()[0].readyState')=='live'
  assert offscreen('fixturePeers.every(p=>p.connectionState==="closed")')
  assert not errors,errors
  print('PASS: repeated Start/Stop, new presentation during capture, no stale peers, meeting share remains active')
  print('PASS: production one-click browser flow; actual tab video, meeting-page microphone, outgoing presentation audio, real Whisper on both channels, tab switch, Stop and saved WebM')
 finally:c.close()
