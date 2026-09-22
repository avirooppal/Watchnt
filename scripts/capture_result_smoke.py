from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with TemporaryDirectory() as profile,sync_playwright() as pw:
 context=pw.chromium.launch_persistent_context(profile,channel='chromium',headless=True,args=[f'--disable-extensions-except={root/"extension/dist"}',f'--load-extension={root/"extension/dist"}'])
 try:
  worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
  extension_id=worker.url.split('/')[2]
  page=context.new_page();page.goto(f'chrome-extension://{extension_id}/index.html')
  page.evaluate("chrome.storage.local.set({isRecording:false,isUploading:false,currentMeetingId:'fixture',pipelineStatus:'COMPLETED',captureError:''})")
  page.get_by_role('heading',name='Meeting saved',exact=True).wait_for()
  page.reload();page.get_by_role('heading',name='Meeting saved',exact=True).wait_for()
  with context.expect_page() as opened:page.get_by_role('button',name='Open meeting',exact=True).click()
  opened.value.wait_for_url('**/dashboard.html#/meeting/fixture')
  page.evaluate("chrome.storage.local.set({pipelineStatus:'FAILED',captureError:'No speech was captured.'})")
  page.get_by_role('heading',name='Capture needs attention',exact=True).wait_for()
  page.get_by_role('alert').get_by_text('No speech was captured.',exact=True).wait_for()
  page.evaluate("chrome.storage.local.set({isUploading:true,pipelineStatus:'EXTRACTING_INTELLIGENCE',captureError:''})")
  page.get_by_role('button',name='Open meeting',exact=True).wait_for()
  print('PASS: saved/failed/processing popup states, saved result survives reopening, Open meeting links to exact recording')
 finally:context.close()
