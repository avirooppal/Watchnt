"""Check real Chromium toolbar sizing in an isolated, visible browser window."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with TemporaryDirectory() as profile, sync_playwright() as pw:
    context = pw.chromium.launch_persistent_context(profile, channel='chromium', headless=False,
        args=[f'--disable-extensions-except={root / "extension/dist"}', f'--load-extension={root / "extension/dist"}'], viewport=None)
    try:
        context.route('http://localhost:8000/**', lambda route: route.fulfill(
            content_type='application/json', body=json.dumps({'status':'ok'} if route.request.url.endswith('/health') else [])))
        worker = context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
        extension_id = worker.url.split('/')[2]
        page = context.new_page()
        page.goto(f'chrome-extension://{extension_id}/dashboard.html')
        page.get_by_role('heading', name='Meetings', exact=True).wait_for()
        for _ in range(2):
            page.bring_to_front()
            worker.evaluate('''async () => {
                const window = await chrome.windows.getLastFocused();
                await chrome.windows.update(window.id, {focused:true});
                await chrome.action.openPopup({windowId:window.id});
            }''')
            page.wait_for_function("() => chrome.extension.getViews({type:'popup'}).some(w => w.innerHeight === 600 && w.document.querySelector('.popup-footer'))")
            result = page.evaluate("""() => chrome.extension.getViews({type:'popup'}).map(w => ({
                width:w.innerWidth, height:w.innerHeight,
                header:w.document.querySelector('.popup-header').getBoundingClientRect().top,
                footer:w.document.querySelector('.popup-footer').getBoundingClientRect().bottom
            }))""")
            assert len(result) == 1 and result[0]['width'] == 400 and result[0]['height'] == 600, result
            assert result[0]['header'] == 0 and result[0]['footer'] <= 601, result
            page.evaluate("() => chrome.extension.getViews({type:'popup'})[0].close()")
            page.wait_for_function("() => chrome.extension.getViews({type:'popup'}).length === 0")
        print('PASS: real toolbar popup opens and reopens at 400 x 600 with header and footer visible')
    finally:
        context.close()
