"""Toolbar state regression with the real unpacked extension and synthetic call DOM."""
from pathlib import Path
from tempfile import TemporaryDirectory
import time
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with TemporaryDirectory() as profile, sync_playwright() as pw:
 context=pw.chromium.launch_persistent_context(profile,channel='chromium',headless=True,args=[f'--disable-extensions-except={root/"extension/dist"}',f'--load-extension={root/"extension/dist"}'])
 try:
  worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
  page=context.new_page()
  page.route('https://meet.google.com/test',lambda route:route.fulfill(body='<html><body><button aria-label="Leave call">Leave</button></body></html>',content_type='text/html'))
  page.goto('https://meet.google.com/test')
  def badge():return worker.evaluate('chrome.action.getBadgeText({})')
  def wait_badge(expected):
   deadline=time.monotonic()+8
   while time.monotonic()<deadline:
    if badge()==expected:return
    time.sleep(.15)
   raise AssertionError((expected,badge()))
  wait_badge('!')
  page.wait_for_timeout(1200)
  assert page.locator('#watchnt-reminder').count()==0
  assert page.locator('#watchnt-bot-root').count()==0
  colors=set()
  for _ in range(8):
   colors.add(tuple(worker.evaluate('chrome.action.getBadgeBackgroundColor({})')));time.sleep(.3)
  assert len(colors)==2,colors
  worker.evaluate('chrome.storage.local.set({isRecording:true})')
  wait_badge('REC')
  assert page.locator('#watchnt-reminder').count()==0
  assert 'Recording' in worker.evaluate('chrome.action.getTitle({})')
  colors=set()
  for _ in range(8):
   colors.add(tuple(worker.evaluate('chrome.action.getBadgeBackgroundColor({})')));time.sleep(.3)
  assert len(colors)==2,colors
  worker.evaluate('chrome.storage.local.set({isRecording:false,isUploading:true})')
  wait_badge('…')
  worker.evaluate('chrome.storage.local.set({isUploading:false})')
  wait_badge('!')
  page.get_by_role('button',name='Leave').evaluate('(e)=>e.remove()')
  wait_badge('')
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.reload()
  page.evaluate('''() => { const button=document.createElement('button'); button.setAttribute('aria-label','Leave call'); document.body.append(button); }''')
  page.wait_for_timeout(1200)
  assert page.locator('#watchnt-reminder').count()==0
  try: worker.evaluate('chrome.runtime.reload()')
  except Exception as error:
   if 'closed' not in str(error) and 'destroyed' not in str(error): raise
  page.wait_for_function("!document.getElementById('watchnt-reminder')")
  page.wait_for_timeout(2200)
  assert not errors,errors
  print('PASS: actual extension reload stays free of reminders with no uncaught content-script errors')
  print('PASS: meeting has no reminder overlay, toolbar recording state, processing and call-end reset')
 finally:context.close()
