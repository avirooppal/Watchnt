"""Run the built extension against an isolated local backend in Chromium.
Requires Python playwright and an installed Chromium runtime. Never uses cloud APIs.
"""
import json
import base64
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def request(path, body=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request('http://localhost:8000'+path, data=data, headers={'Content-Type':'application/json'}, method=method)
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.load(response)

with socket.socket() as check:
    if check.connect_ex(('127.0.0.1',8000)) == 0:
        raise SystemExit('Port 8000 is occupied; stop that service before this isolated smoke test.')

with tempfile.TemporaryDirectory(prefix='watchnt-ui-') as directory:
    folder = Path(directory)
    env = {**os.environ, 'DATABASE_URL':'sqlite:///'+(folder/'test.db').as_posix(), 'MEETINGS_DIR':str(folder/'meetings')}
    log = open(folder/'backend.log','w')
    server = subprocess.Popen([sys.executable,'-m','uvicorn','main:app','--host','127.0.0.1','--port','8000'],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
    try:
        for _ in range(100):
            try: request('/health'); break
            except Exception: time.sleep(.1)
        meeting=request('/meeting',{'title':'Website launch review'})
        with sqlite3.connect(folder/'test.db') as database:
            database.execute("UPDATE meetings SET status='COMPLETED', duration_minutes='12' WHERE id=?",(meeting['id'],))
        database.close()
        canonical={'meeting':{'id':meeting['id'],'title':meeting['title'],'status':'COMPLETED'},'ai':{'summary':{'status':'completed','data':{'meeting_snapshot':'We agreed to launch on Friday.','discussion_summary':'Alex owns the release.'}},'actions':{'status':'completed','data':[{'task':'Send release notes','owner':'Alex','deadline':'Friday','confidence':'High','priority':'High','evidence':'Alex will send release notes on Friday.'}]}}}
        (folder/'meetings'/meeting['id']/'meeting.json').write_text(json.dumps(canonical),encoding='utf8')
        (folder/'meetings'/meeting['id']/'transcript.json').write_text(json.dumps({'segments':[{'speaker':'Alex','text':'I will send release notes on Friday.','start':0,'end':4,'language':'en','confidence':.85}]}),encoding='utf8')
        with sync_playwright() as pw:
            extension=str(ROOT/'extension'/'dist')
            context=pw.chromium.launch_persistent_context(str(folder/'browser'),channel='chromium',headless=True,args=[f'--disable-extensions-except={extension}',f'--load-extension={extension}', '--autoplay-policy=no-user-gesture-required'],viewport={'width':1440,'height':1000})
            try:
                worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
                extension_id=worker.url.split('/')[2]
                page=context.new_page()
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(f'chrome-extension://{extension_id}/dashboard.html')
                page.get_by_role('heading',name='Meetings',exact=True).wait_for()
                assert not page.get_by_text('A space that stays yours.',exact=True).count()
                page.get_by_role('heading',name='Website launch review').wait_for()
                page.get_by_placeholder('New folder').fill('Engineering')
                page.get_by_role('button',name='Create',exact=True).click()
                page.get_by_role('button',name='Engineering').wait_for()
                page.get_by_label('Move to folder').select_option(label='Engineering')
                page.get_by_placeholder('Search meetings').fill('absent')
                page.get_by_role('heading',name='No matching meetings').wait_for()
                page.get_by_placeholder('Search meetings').fill('')
                screenshots=ROOT/'artifacts';screenshots.mkdir(exist_ok=True)
                page.screenshot(animations="disabled",path=str(screenshots/'library.png'),full_page=True)
                accessibility_failures=[]
                def accessibility(label):
                    page.evaluate("async () => {await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))}")
                    page.evaluate((ROOT/'extension/node_modules/axe-core/axe.min.js').read_text(encoding='utf8'))
                    violations=page.evaluate("async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id, nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))")
                    if violations: accessibility_failures.append((label,violations))
                    print("Accessibility:",label,violations,flush=True)
                accessibility('library')
                page.get_by_role('button',name='Delete: Website launch review',exact=True).click()
                page.get_by_role('dialog').wait_for()
                page.keyboard.press('Escape')
                assert page.get_by_role('dialog').count()==0 or not page.get_by_role('dialog').is_visible()
                assert page.evaluate("document.activeElement.getAttribute('aria-label')")=='Delete: Website launch review'
                page.get_by_role('link',name='Action items',exact=True).click()
                with page.expect_response(lambda r: '/action/0' in r.url and r.request.method=='PATCH'):
                    page.get_by_role('checkbox').check()
                page.reload()
                assert page.get_by_role('checkbox').is_checked()
                page.route('**/meeting/*/action/0',lambda route:route.fulfill(status=500,content_type='application/json',body='{"detail":"Simulated save failure"}'))
                page.get_by_role('checkbox').uncheck()
                page.get_by_role('alert').wait_for()
                assert page.get_by_role('checkbox').is_checked(), 'Failed save must roll back'
                page.unroute('**/meeting/*/action/0')
                page.reload()
                page.get_by_role('checkbox').wait_for()
                page.screenshot(animations="disabled",path=str(screenshots/'actions.png'),full_page=True)
                accessibility('actions')
                page.get_by_role('link',name='Website launch review').click()
                page.get_by_role('tab',name='Summary',exact=True).click()
                page.get_by_text('We agreed to launch on Friday.').wait_for()
                page.screenshot(animations="disabled",path=str(screenshots/'detail.png'),full_page=True)
                accessibility('detail')
                page.get_by_role('button',name='Rename',exact=True).click()
                page.get_by_role('dialog').get_by_label('Meeting title').fill('Website launch review updated')
                page.get_by_role('dialog').get_by_role('button',name='Save changes').click()
                page.get_by_role('heading',name='Website launch review updated').wait_for()
                current_url=page.url
                page.locator('.skip-link').focus()
                page.keyboard.press('Enter')
                assert page.url==current_url
                assert page.evaluate("document.activeElement.id")=='main-content'
                page.get_by_role('tab',name='Summary',exact=True).focus()
                page.keyboard.press('ArrowRight')
                assert page.get_by_role('tab',name='Action items',exact=True).get_attribute('aria-selected')=='true'
                page.get_by_role('tab',name='Transcript',exact=True).click()
                page.get_by_text('I will send release notes on Friday.').wait_for()
                with page.expect_download() as download:
                    page.get_by_role('button',name='Export JSON').click()
                assert download.value.suggested_filename.endswith('.json')
                if os.environ.get('WATCHNT_TEST_STT') == '1':
                    audio = base64.b64encode((ROOT/'artifacts'/'speech-smoke.wav').read_bytes()).decode()
                    transcript = page.evaluate("""async (encoded) => {
                      const context = new AudioContext({sampleRate:16000});
                      const bytes=Uint8Array.from(atob(encoded), c=>c.charCodeAt(0));
                      const buffer=await context.decodeAudioData(bytes.buffer);
                      await context.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));
                      const node=new AudioWorkletNode(context,'pcm-window',{processorOptions:{channels:1}});
                      const source=context.createBufferSource(); source.buffer=buffer;
                      const mute=context.createGain();mute.gain.value=0;source.connect(node).connect(mute).connect(context.destination);
                      const socket=new WebSocket('ws://localhost:8000/ws/transcribe');
                      try {
                        return await new Promise((resolve,reject)=>{
                          const timeout=setTimeout(()=>reject(new Error('STT timed out')),30000);
                          socket.onopen=()=>socket.send(JSON.stringify({channels:1,sampleRate:16000}));
                          socket.onmessage=async event=>{
                            const message=JSON.parse(event.data);
                            if(message.ready){await context.resume();source.start();}
                            else if(message.error){clearTimeout(timeout);reject(new Error(message.error));}
                            else {clearTimeout(timeout);resolve(message.segments.map(s=>s.text).join(' '));}
                          };
                          node.port.onmessage=({data})=>{if(data.pcm)socket.send(data.pcm);};
                          source.onended=()=>node.port.postMessage('flush');
                          socket.onerror=()=>reject(new Error('WebSocket failed'));
                        });
                      } finally {socket.close();await context.close();}
                    }""", audio)
                    assert 'Friday' in transcript and 'website' in transcript, transcript
                    print('PASS: real Chromium AudioWorklet -> PCM WebSocket -> local Whisper CPU transcription:',transcript)
                page.get_by_role('link',name='Settings',exact=True).click()
                page.route('**/config',lambda route:route.abort())
                page.reload()
                page.get_by_role('heading',name='Start the backend').wait_for()
                page.get_by_text('Cannot connect to the backend at localhost:8000. Start it and try again.',exact=True).wait_for()
                page.screenshot(animations="disabled",path=str(screenshots/'settings-offline.png'),full_page=True)
                page.unroute('**/config')
                page.get_by_role('button',name='Try again',exact=True).click()
                page.get_by_label('Spoken language').select_option('hi')
                assert not page.get_by_role('alert').count()
                accessibility('settings')
                page.screenshot(animations="disabled",path=str(screenshots/'settings.png'),full_page=True)
                page.get_by_role('button',name='Save changes').click()
                page.get_by_text('Saved',exact=True).wait_for()
                assert request('/config')['transcription_language']=='hi'
                page.get_by_label('Interface language').select_option('es')
                page.get_by_role('heading',name='Configuración').wait_for()
                page.screenshot(animations="disabled",path=str(screenshots/'settings-es.png'),full_page=True)
                page.reload()
                page.get_by_role('heading',name='Configuración').wait_for()
                page.set_viewport_size({'width':390,'height':844})
                page.get_by_role('link',name='Biblioteca de reuniones',exact=True).click()
                page.get_by_role('heading',name='Reuniones',exact=True).wait_for()
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                page.screenshot(animations="disabled",path=str(screenshots/'library-mobile.png'),full_page=True)
                accessibility('mobile library')
                for route, title in [('/actions','Tareas'),('/settings','Configuración'),('/meeting/'+meeting['id'],'Website launch review updated')]:
                    page.goto(f'chrome-extension://{extension_id}/dashboard.html#'+route)
                    page.get_by_role('heading',name=title,exact=True).wait_for()
                    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), (route,page.evaluate("Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right]).slice(0,20)"))
                    page.screenshot(animations="disabled",path=str(screenshots/('mobile-'+route.split('/')[1]+'.png')),full_page=True)
                page.set_viewport_size({'width':1440,'height':1000})
                page.evaluate("chrome.storage.local.set({uiLanguage:'en'})")
                page.goto(f'chrome-extension://{extension_id}/index.html')
                page.locator('.popup-shell').wait_for()
                page.set_viewport_size({'width':190,'height':600})
                assert page.evaluate('document.body.getBoundingClientRect().width')==400
                assert page.locator('.popup-shell').bounding_box()['width']==400
                assert page.locator('.popup-main').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
                page.set_viewport_size({'width':400,'height':600})
                page.locator('.popup-shell').screenshot(animations="disabled",path=str(screenshots/'popup.png'))
                assert page.locator('.popup-shell').bounding_box()['height'] <= 600
                accessibility('popup')
                page.evaluate("chrome.storage.local.set({isRecording:true,recordingStartTime:Date.now()-65000,liveTranscript:'Alex will send the release notes on Friday.',liveConfidence:.88})")
                page.get_by_text('Alex will send the release notes on Friday.').wait_for()
                page.locator('.popup-shell').screenshot(animations="disabled",path=str(screenshots/'popup-recording.png'))
                accessibility('popup recording')
                page.route('https://meet.google.com/watchnt-ui-test',lambda route:route.fulfill(body='<html lang="en"><head><title>Meeting fixture</title></head><body><main><h1>Meeting fixture</h1></main></body></html>',content_type='text/html'))
                page.goto('https://meet.google.com/watchnt-ui-test')
                assert page.locator('#watchnt-bot-root').count()==0
                assert not errors, errors
                assert not accessibility_failures, accessibility_failures
                print('PASS: extension load, folders, search, persisted actions, failed-save rollback, rename/dialog focus, keyboard tabs/skip link, transcript/export, settings/language persistence, mobile layouts, popup/controller, axe WCAG checks, no page errors')
            finally: context.close()
    finally:
        server.terminate();server.wait(timeout=10);log.close()
