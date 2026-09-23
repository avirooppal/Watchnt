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
        context.route('http://localhost:8000/**', lambda route: route.fulfill(content_type='application/json', body=json.dumps(backend_state if route.request.url.endswith('/status') else {'status': 'ok'})))
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
        assert initial == {'body':600, 'root':600}, initial
        for height in (600, 480):
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
                page.get_by_text('Local engine online', exact=True).wait_for()
                page.get_by_role('heading').wait_for()
                metrics = page.evaluate('''() => {
                    const main=document.querySelector('.popup-main'), header=document.querySelector('.popup-header'), footer=document.querySelector('.popup-footer');
                    return {width:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight,
                        top:header.getBoundingClientRect().top, bottom:footer.getBoundingClientRect().bottom,
                        padding:parseFloat(getComputedStyle(main).paddingLeft), scroll:main.scrollTop};
                }''')
                assert metrics['width'] <= 400 and metrics['height'] == 600, (state, height, metrics)
                assert metrics['top'] >= 0 and metrics['bottom'] <= height + 1, (state, height, metrics)
                assert metrics['padding'] >= 16 and metrics['scroll'] == 0, metrics
                if state == 'failed':
                    assert page.get_by_role('alert').count() == 1
                    page.get_by_role('button',name='Check model settings',exact=True).wait_for()
                    if height == 600:
                        page.screenshot(path=str(root/'artifacts/popup-recovery.png'), animations='disabled')
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
        assert not errors, errors
        print('PASS: five popup states at 600px and 480px; fixed header/footer, one scroll region, padding, error detail, meeting recovery link')
    finally:
        context.close()
