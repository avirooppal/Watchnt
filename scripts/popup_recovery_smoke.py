"""Popup layout and recovery tests using isolated storage and synthetic failures."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with TemporaryDirectory() as profile, sync_playwright() as pw:
    context = pw.chromium.launch_persistent_context(profile, channel='chromium', headless=True,
        args=[f'--disable-extensions-except={root / "extension/dist"}', f'--load-extension={root / "extension/dist"}'],
        viewport={'width': 400, 'height': 600})
    try:
        backend_state = {'status':'COMPLETED','error':''}
        context.route('http://localhost:8000/**', lambda route: route.fulfill(content_type='application/json', body=json.dumps(backend_state if route.request.url.endswith('/status') else [] if route.request.url.endswith('/providers') else {'llm_provider':'ollama','llm_model':'llama3','cloud_text_consent':'no','transcription_language':'auto'} if route.request.url.endswith('/config') else {'status':'ok'})))
        worker = context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
        extension_id = worker.url.split('/')[2]
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script("chrome.tabs.query = (_, callback) => callback([{url:'https://meet.google.com/test-meeting'}])")
        # Toolbar popups start tiny and Chrome measures the document to size them.
        # A viewport-relative shell alone collapses permanently at this step.
        page.set_viewport_size({'width':400, 'height':25})
        page.goto(f'chrome-extension://{extension_id}/index.html')
        page.locator('.popup-shell').wait_for(state='attached')
        initial = page.evaluate("() => ({body:document.body.getBoundingClientRect().height, root:document.querySelector('#root').getBoundingClientRect().height})")
        assert 200 <= initial['body'] <= 560 and initial['body']==initial['root'],initial
        for height in (460, 360):
            page.set_viewport_size({'width':400, 'height':height})
            for state in ('idle', 'recording', 'uploading', 'failed', 'completed'):
                awaitable = {'onboardingCompleted':True, 'isRecording':state=='recording', 'isUploading':state=='uploading',
                    'currentMeetingId': 'synthetic' if state in ('failed','completed','uploading') else '',
                    'pipelineStatus': {'failed':'FAILED','completed':'COMPLETED','uploading':'EXTRACTING_INTELLIGENCE'}.get(state,''),
                    'captureError': 'OpenRouter timed out. Your transcript is saved. Retry processing or choose another model in Settings.' if state=='failed' else '',
                    'liveTranscript':'Synthetic live transcript.', 'recordingStartTime': 0}
                backend_state.update(status=awaitable['pipelineStatus'],error=awaitable['captureError'])
                worker.evaluate('(state) => chrome.storage.local.set(state)', awaitable)
                page.goto(f'chrome-extension://{extension_id}/index.html')
                page.wait_for_function("() => !document.querySelector('.capture-primary')?.disabled || !!document.querySelector('.processing-indicator')")
                page.get_by_role('heading').wait_for()
                metrics = page.evaluate('''() => {
                    const main=document.querySelector('.popup-main'), header=document.querySelector('.popup-header'), footer=document.querySelector('.popup-footer');
                    return {width:document.documentElement.scrollWidth, height:document.querySelector('.popup-shell').getBoundingClientRect().height,
                        top:header.getBoundingClientRect().top, bottom:footer.getBoundingClientRect().bottom,
                        padding:parseFloat(getComputedStyle(main).paddingLeft), scroll:main.scrollTop};
                }''')
                assert metrics['width'] <= 400 and 180 <= metrics['height'] <= 560, (state, height, metrics)
                assert metrics['top'] >= 0 and metrics['bottom'] <= metrics['height'] + 1, (state, height, metrics)
                if height == 460:
                    assert page.locator('.popup-main').evaluate('(element) => element.scrollHeight <= element.clientHeight'), state
                assert page.locator('.popup-main').evaluate('(element) => getComputedStyle(element).scrollbarWidth') == 'none'
                assert metrics['padding'] >= 16 and metrics['scroll'] == 0, metrics
                assert page.locator('.popup-header .brand-logo').get_attribute('src') == '/logo.jpg'
                assert page.locator('.connection-row, .capture-modes').count() == 0
                if height == 460:
                    page.locator('.popup-shell').screenshot(path=str(root/('artifacts/popup-'+state+'.png')),animations='disabled')
                    page.evaluate((root/'extension/node_modules/axe-core/axe.min.js').read_text(encoding='utf8'))
                    violations=page.evaluate("async () => (await axe.run(document.querySelector('.popup-shell'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}})).violations.map(v=>({id:v.id,impact:v.impact}))")
                    assert not violations,(state,violations)
                if state == 'idle':
                    assert metrics['height'] < 320,metrics
                    assert page.locator('.popup-options').count() == 0
                    with context.expect_page() as settings:
                        page.get_by_role('button', name='Settings', exact=True).click()
                    settings.value.wait_for_url('**/dashboard.html#/settings')
                    settings.value.close()
                if state == 'completed':
                    if height == 460:
                        page.locator('.popup-shell').screenshot(path=str(root/'artifacts/popup-saved.png'), animations='disabled')
                    page.get_by_role('button', name='Dismiss notification').click()
                    page.get_by_role('button', name='Open meeting', exact=True).wait_for(state='hidden')
                    page.reload()
                    page.get_by_role('heading', name='Capture meeting', exact=True).wait_for()
                    assert page.get_by_role('button', name='Open meeting', exact=True).count() == 0
                    assert worker.evaluate("chrome.storage.local.get('currentMeetingId')")['currentMeetingId'] == 'synthetic'
                    worker.evaluate("chrome.storage.local.remove('dismissedCaptureId')")
                if state == 'uploading' and height == 460:
                    page.locator('.popup-shell').screenshot(path=str(root/'artifacts/popup-processing.png'), animations='disabled')
                if state == 'failed':
                    assert page.get_by_role('alert').count() == 1
                    page.get_by_role('button',name='Check model settings',exact=True).wait_for()
                    if height == 460:
                        page.locator('.popup-shell').screenshot(path=str(root/'artifacts/popup-recovery.png'), animations='disabled')
                    with context.expect_page() as opened:
                        page.get_by_role('button',name='Open meeting',exact=True).click()
                    target=opened.value
                    target.wait_for_url('**/dashboard.html#/meeting/synthetic')
                    target.close()
                page.locator('.popup-main').evaluate('(main) => main.scrollTop = main.scrollHeight')
                assert page.locator('.popup-header').bounding_box()['y'] == 0
        # A stale failed popup refreshes from the backend when reopened.
        backend_state.update(status='COMPLETED', error='')
        worker.evaluate("() => chrome.storage.local.set({currentMeetingId:'synthetic',pipelineStatus:'FAILED',captureError:'Old failure',isUploading:false,isRecording:false})")
        page.reload()
        page.get_by_role('heading',name='Meeting saved',exact=True).wait_for()
        assert page.get_by_role('alert').count()==0
        worker.evaluate("chrome.storage.local.set({isStarting:false,isRecording:false,isUploading:false,currentMeetingId:'',pipelineStatus:'',captureError:''})")
        unsupported=context.new_page()
        unsupported.goto(f'chrome-extension://{extension_id}/index.html')
        unsupported.get_by_role('heading',name='Open a meeting',exact=True).wait_for()
        assert unsupported.get_by_role('button',name='Start capture',exact=True).is_disabled()
        assert unsupported.locator('.popup-shell').bounding_box()['height']<340
        unsupported.keyboard.press('Tab')
        assert unsupported.get_by_role('button',name='Settings',exact=True).evaluate('(e)=>e===document.activeElement')
        unsupported.locator('.popup-shell').screenshot(path=str(root/'artifacts/popup-no-meeting.png'))
        unsupported.close()
        assert not errors, errors
        print('PASS: compact adaptive popup, five states, WCAG A/AA checks, recovery and settings links')
    finally:
        context.close()
