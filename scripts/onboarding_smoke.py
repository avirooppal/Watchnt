"""First-run onboarding with isolated browser storage and mocked backend responses."""
import json,time,sys
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'backend'))
from services.providers.catalog import public_catalog
config={'llm_provider':'ollama','llm_model':'test-model','cloud_text_consent':'no','ollama_base_url':'http://localhost:11434/api/generate','transcription_language':'auto'}
state={'offline':True,'model_ok':False}
with TemporaryDirectory() as profile,sync_playwright() as pw:
 context=pw.chromium.launch_persistent_context(profile,channel='chromium',headless=True,args=[f'--disable-extensions-except={root/"extension/dist"}',f'--load-extension={root/"extension/dist"}'],viewport={'width':1280,'height':900})
 try:
  def backend(route):
   path=route.request.url.split(':8000')[-1]
   if state['offline']:route.abort();return
   if path=='/config':
    if route.request.method=='POST':config.update(route.request.post_data_json)
    data=config
   elif path=='/providers':data=public_catalog()
   elif path=='/config/test':data={'whisper':{'status':'ok' if state['model_ok'] else 'error','message':'Speech model ready' if state['model_ok'] else 'Whisper model missing'},config['llm_provider']:{'status':'ok','message':'Model responded'}}
   elif path in ['/meetings','/folders']:data=[]
   else:data='OK'
   route.fulfill(content_type='application/json',body=json.dumps(data))
  context.route('http://localhost:8000/**',backend)
  worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
  extension_id=worker.url.split('/')[2]
  deadline=time.monotonic()+8
  while not any('#/onboarding' in page.url for page in context.pages) and time.monotonic()<deadline:
   worker.evaluate("1");time.sleep(.1)
  pages=[page for page in context.pages if '#/onboarding' in page.url]
  assert pages,'Installation must open onboarding automatically'
  page=pages[0];errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.screenshot(path=str(root/'artifacts/onboarding.png'),full_page=True,animations='disabled')
  page.get_by_role('button',name='Check connection and continue').click()
  page.get_by_role('alert').wait_for()
  assert page.locator('[aria-current="step"]').inner_text().endswith('Connect backend')
  state['offline']=False
  page.get_by_role('button',name='Check connection and continue').click()
  page.get_by_label('Spoken language').wait_for()
  page.evaluate("() => {navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError')}}")
  page.get_by_role('button',name='Allow microphone capture (optional)').click()
  page.get_by_role('alert').wait_for()
  page.get_by_label('Spoken language').select_option('es')
  page.get_by_role('button',name='Save and continue').click()

  page.get_by_label('AI provider',exact=True).wait_for()
  page.reload();page.get_by_label('AI provider',exact=True).wait_for()
  assert config['transcription_language']=='es'
  assert page.get_by_label('AI provider',exact=True).locator('option').count()==13
  for provider in public_catalog():
   if not provider['cloud']:continue
   page.get_by_label('AI provider',exact=True).select_option(provider['id'])
   assert not page.get_by_role('checkbox').is_checked()
   assert page.get_by_label('Model name').input_value()==provider['default_model']
   page.get_by_role('checkbox').check()
  page.get_by_label('AI provider',exact=True).select_option('ollama_cloud')
  page.get_by_text('Connects directly to Ollama Cloud.',exact=False).wait_for()
  page.get_by_label('AI provider',exact=True).select_option('openai')
  page.get_by_role('button',name='Save and test').click()
  page.get_by_role('alert').wait_for()
  assert config['llm_provider']=='ollama','Cloud selection without consent must not save'
  page.get_by_label('AI provider',exact=True).select_option('ollama')
  page.get_by_label('Model name').fill('test-model')
  page.get_by_role('button',name='Save and test').click()
  page.get_by_text('error · Whisper model missing',exact=True).wait_for()
  assert not page.evaluate('async()=> (await chrome.storage.local.get("onboardingCompleted")).onboardingCompleted')
  state['model_ok']=True
  page.get_by_role('button',name='Save and test').click()
  page.get_by_role('heading',name='Setup complete',exact=True).wait_for()
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='Finish and open library').click()
  page.get_by_role('heading',name='Meetings',exact=True).wait_for()
  assert page.evaluate('async()=> (await chrome.storage.local.get("onboardingCompleted")).onboardingCompleted')
  page.goto(f'chrome-extension://{extension_id}/index.html')
  page.get_by_role('heading',name='Capture meeting').wait_for()
  assert page.get_by_role('button',name='Finish setup',exact=True).count()==0
  page.goto(f'chrome-extension://{extension_id}/dashboard.html#/settings')
  for provider in public_catalog():
   if not provider['cloud']:continue
   page.get_by_label('AI provider',exact=True).select_option(provider['id'])
   page.get_by_label('Model name').fill('account-model')
   page.get_by_label('API key',exact=True).fill('test-key-'+provider['id'])
   page.get_by_role('checkbox').check()
   page.get_by_role('button',name='Test connections',exact=True).click()
   page.get_by_text('ok · Model responded',exact=True).wait_for()
   assert config['llm_provider']==provider['id']
   assert config[provider['id']+'_api_key']=='test-key-'+provider['id']
  page.reload()
  assert page.get_by_label('AI provider',exact=True).input_value()=='xai'
  page.get_by_role('link',name='View provider models and setup').wait_for()
  page.get_by_role('link',name='Run setup again').click()
  page.get_by_role('button',name='Check connection and continue').wait_for()
  assert not errors,errors
  print('PASS: onboarding, offline retry, microphone denial, language save, all 13 providers, cloud consent reset, separate cloud keys and diagnostics, saved selection, failed model blocks completion, mobile layout, settings restart')
 finally:context.close()
