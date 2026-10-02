"""Real Chromium MediaRecorder with synthetic meeting video/audio and local API stubs."""
import json
import sys
import base64
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
speech_directory = next((Path(arg.split('=',1)[1]) for arg in sys.argv if arg.startswith('--speech-directory=')), None)
with TemporaryDirectory() as profile, sync_playwright() as pw:
    context = pw.chromium.launch_persistent_context(profile, channel='chromium', headless=True,
        args=[f'--disable-extensions-except={root / "extension/dist"}', f'--load-extension={root / "extension/dist"}', '--autoplay-policy=no-user-gesture-required'])
    try:
        chunks, calls = [], []
        fail_upload = False
        def api(route):
            request = route.request
            path = request.url.removeprefix('http://localhost:8000')
            calls.append(path)
            if path == '/meeting/synthetic/recording':
                route.fulfill(content_type='video/webm', body=b''.join(chunks))
                return
            if '/recording/chunks/' in path:
                if fail_upload:
                    route.fulfill(status=507, body='Storage full')
                    return
                body = b'Content-Type: ' + request.headers['content-type'].encode() + b'\r\n\r\n' + request.post_data_buffer
                part = next(BytesParser(policy=default).parsebytes(body).iter_parts())
                assert int(path.rsplit('/', 1)[1]) == len(chunks)
                chunks.append(part.get_payload(decode=True))
            result = {'id': 'synthetic'} if path == '/meeting' else {'status': 'COMPLETED'}
            if path == '/meeting/synthetic':
                result = {'meeting': {'id': 'synthetic', 'title': 'Recorded meeting', 'status': 'COMPLETED'}, 'recording_available': True}
            route.fulfill(content_type='application/json', body=json.dumps(result))
        context.route('http://localhost:8000/**', api)
        worker = context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
        extension_id = worker.url.split('/')[2]
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if speech_directory:
            page.add_init_script('window.speechAudio = ' + json.dumps({name:base64.b64encode((speech_directory/(name+'.wav')).read_bytes()).decode() for name in ('meeting','microphone')}) + ';')
        page.add_init_script("""(() => {
          window.captureConstraints = [];
          navigator.mediaDevices.getUserMedia = async constraints => {
            captureConstraints.push(constraints);
            if (window.denyMicrophone && !constraints.video) throw new DOMException('Permission denied','NotAllowedError');
            const audio = new AudioContext();
            await audio.resume();
            const destination = audio.createMediaStreamDestination();
            if (window.speechAudio) {
              const key = constraints.audio?.mandatory ? 'meeting' : 'microphone';
              const source = audio.createBufferSource();
              source.buffer = await audio.decodeAudioData(Uint8Array.from(atob(speechAudio[key]),c=>c.charCodeAt(0)).buffer);
              source.loop = true; source.connect(destination); source.start();
            } else {
              const tone = audio.createOscillator(); tone.connect(destination); tone.start();
            }
            if (!constraints.video || constraints.audio?.mandatory?.chromeMediaSource === 'desktop') return destination.stream;
            const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
            const paint = () => {const ctx = canvas.getContext('2d'); ctx.fillStyle = '#236c53'; ctx.fillRect(0,0,640,360); ctx.fillStyle = '#fff'; ctx.font = '32px sans-serif'; ctx.fillText('Shared presentation ' + Date.now(), 25, 180);};
            paint(); setInterval(paint, 100);
            return new MediaStream([...canvas.captureStream(15).getTracks(), ...(constraints.audio === false ? [] : destination.stream.getTracks())]);
          };
          if (!window.speechAudio) window.WebSocket = class {
            static OPEN = 1; readyState = 1;
            constructor() {setTimeout(() => this.onopen?.(), 20);}
            send(data) {setTimeout(() => this.onmessage?.({data:JSON.stringify(typeof data === 'string' ? {ready:true} : {segments:[{text:'Synthetic spoken words',speaker:'Meeting',start:0,end:1}]})}), 20);}
            close() {this.readyState = 3; this.onclose?.();}
          };
        })();""")
        page.goto(f'chrome-extension://{extension_id}/offscreen.html')
        page.wait_for_timeout(300)
        worker.evaluate("chrome.runtime.sendMessage({type:'OFFSCREEN_START_RECORDING',payload:{streamId:'synthetic',desktopStreamId:'system-audio'}})")
        page.wait_for_function("async () => (await chrome.storage.local.get('isRecording')).isRecording")
        page.wait_for_timeout(5500)
        assert chunks, 'Video must stream to disk before Stop'
        # Switch away from the captured page, open/close/reopen the popup, and
        # allow another live transcription window to finish without pressing Stop.
        other = context.new_page()
        other.goto('about:blank')
        other.bring_to_front()
        popup = context.new_page()
        popup.goto(f'chrome-extension://{extension_id}/index.html')
        popup.get_by_role('button', name='Stop & save', exact=True).wait_for()
        popup.close()
        other.bring_to_front()
        page.wait_for_timeout(5000)
        if speech_directory:
            for _ in range(300):
                segments = worker.evaluate("chrome.storage.local.get('recoveryTranscript')").get('recoveryTranscript', [])
                if {segment['speaker'] for segment in segments} >= {'Meeting audio', 'Me'}:
                    break
                page.wait_for_timeout(200)
            meeting_text = ' '.join(s['text'] for s in segments if s['speaker'] == 'Meeting audio').lower()
            microphone_text = ' '.join(s['text'] for s in segments if s['speaker'] == 'Me').lower()
            assert 'budget' in meeting_text and 'friday' in meeting_text, meeting_text
            assert 'presentation' in microphone_text and 'report' in microphone_text, microphone_text
            print('PASS: real Whisper transcribes separate presentation and microphone speech through the browser audio graph')
        state = worker.evaluate("chrome.storage.local.get(['isRecording','isUploading','pipelineStatus','liveTranscript'])")
        assert state['isRecording'] and not state['isUploading'] and state['pipelineStatus'] == 'RECORDING', state
        assert state['liveTranscript'], state
        assert '/upload_transcript' not in calls and '/meeting/synthetic/recording/complete' not in calls, calls
        popup = context.new_page()
        popup.goto(f'chrome-extension://{extension_id}/index.html')
        popup.get_by_role('button', name='Stop & save', exact=True).click()
        for _ in range(100):
            state = page.evaluate("async () => await chrome.storage.local.get(['pipelineStatus','captureError'])")
            if state.get('pipelineStatus') in ('COMPLETED', 'FAILED'):
                break
            page.wait_for_timeout(200)
        assert state.get('pipelineStatus') == 'COMPLETED', state
        assert calls.index('/meeting/synthetic/recording/complete') < calls.index('/upload_transcript')
        assert chunks[0].startswith(b'\x1a\x45\xdf\xa3')
        assert page.evaluate('captureConstraints[0].video.mandatory.chromeMediaSource') == 'tab'
        assert page.evaluate('captureConstraints[0].audio') is False
        assert page.evaluate('captureConstraints[1].audio.mandatory.chromeMediaSource') == 'desktop'
        assert page.evaluate("async () => (await chrome.storage.local.get('liveTranscript')).liveTranscript")
        # Decode the actual recorded WebM; a fake header alone cannot pass this.
        dimensions = page.evaluate("""async bytes => {
          const video = document.createElement('video');
          video.src = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:'video/webm'}));
          await new Promise((resolve,reject) => {video.onloadeddata=resolve;video.onerror=reject;});
          return [video.videoWidth, video.videoHeight];
        }""", list(b''.join(chunks)))
        assert dimensions == [640, 360], dimensions
        if '--verify-local-storage' in sys.argv:
            # Verify the running local service without submitting any transcript
            # or triggering AI jobs. Delete only the fixture created here.
            import httpx
            with httpx.Client(base_url='http://localhost:8000', timeout=20) as client:
                created = client.post('/meeting', json={'title':'WatchNT temporary recording verification'})
                created.raise_for_status()
                fixture_id = created.json()['id']
                try:
                    base = f'/meeting/{fixture_id}/recording'
                    encoded = b''.join(chunks)
                    client.put(base + '/chunks/0', files={'file':('chunk.webm',encoded,'video/webm')}).raise_for_status()
                    client.post(base + '/complete').raise_for_status()
                    assert client.get(base).content == encoded
                    assert client.get(base,headers={'Range':'bytes=0-3'}).content == encoded[:4]
                    print('PASS: running backend saves and reads actual WebM on the mounted meeting volume')
                finally:
                    client.delete('/meeting/' + fixture_id).raise_for_status()
        playback = context.new_page()
        playback.on('pageerror', lambda error: errors.append(str(error)))
        playback.goto(f'chrome-extension://{extension_id}/dashboard.html#/meeting/synthetic')
        playback.get_by_text('Meeting recording', exact=True).click()
        playback.wait_for_function("() => document.querySelector('video')?.videoWidth === 640")
        playback.close()
        fail_upload = True
        worker.evaluate("chrome.runtime.sendMessage({type:'OFFSCREEN_START_RECORDING',payload:{streamId:'synthetic'}})")
        for _ in range(100):
            state = page.evaluate("async () => await chrome.storage.local.get(['pipelineStatus','captureError','isRecording'])")
            if state.get('pipelineStatus') == 'FAILED':
                break
            page.wait_for_timeout(200)
        assert state.get('pipelineStatus') == 'FAILED' and state['isRecording'] is False, state
        assert 'could not be saved' in state['captureError'], state
        created_before = calls.count('/meeting')
        page.evaluate('window.denyMicrophone = true')
        denied = worker.evaluate("chrome.runtime.sendMessage({type:'OFFSCREEN_START_RECORDING',payload:{streamId:'synthetic',desktopStreamId:'system-audio'}})")
        assert denied['ok'] is False and 'Microphone access is required' in denied['error'], denied
        assert calls.count('/meeting') == created_before, 'Microphone failure must not create a meeting'
        assert not worker.evaluate("chrome.storage.local.get('isRecording')")['isRecording']
        print('PASS: offscreen microphone denial aborts startup before creating a meeting')
        assert not errors, errors
        print('PASS: tab switching and popup reopening keep recording; explicit Stop saves; video/audio, live transcript, playback and storage-failure cleanup')
    finally:
        context.close()
