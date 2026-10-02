import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../extension/node_modules/typescript/lib/typescript.js';
const code = ts.transpile(fs.readFileSync('extension/src/content/index.tsx','utf8').replace(/^import .*;\r?\n/gm,''), {target:ts.ScriptTarget.ES2022});
const tick = () => new Promise(resolve=>setImmediate(resolve));
for (const failure of ['missing-id','send-throws','send-rejects','storage-throws','storage-rejects']) {
  const timers = new Map(); let serial=0, stopped=0, removed=0, invalid=false, listener;
  const fail=kind=>{if(failure===kind+'-throws')throw Error('Extension context invalidated.');return failure===kind+'-rejects'?Promise.reject(Error('Extension context invalidated.')):Promise.resolve({});};
  const element=()=>({append(){},setAttribute(){},attachShadow:element,remove(){removed++;}});
  const sandbox={console,document:{getElementById:()=>null,createElement:element,documentElement:element(),querySelectorAll:()=>[{getClientRects:()=>[{}]}]},window:{addEventListener(){}},
    setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id),
    stopAudioBridge(){},startObserver(){},stopObserver(){stopped++;return [];},currentTranscript:()=>[],
    chrome:{runtime:{id:'valid',sendMessage:()=>invalid?fail('send'):Promise.resolve(),onMessage:{addListener:fn=>listener=fn}},storage:{local:{get:()=>failure.startsWith('boot')?fail('boot'):Promise.resolve({}),set:()=>invalid?fail('storage'):Promise.resolve()},onChanged:{addListener(){}}}}};
  vm.createContext(sandbox);vm.runInContext(code,sandbox);await tick();
  if (!failure.startsWith('boot')) {
    for(const callback of [...timers.values()]) callback();
    await tick();
    listener({type:'CAPTIONS_START'},null,()=>{});await tick();
    invalid=true;
    if(failure==='missing-id') sandbox.chrome.runtime.id=undefined;
    for(const callback of [...timers.values()]) callback();
    await tick();
  }
  assert.equal(timers.size,0,failure+' must stop all timers');
  assert.equal(stopped,1,failure+' must disconnect caption observer once');

}
console.log('PASS: invalidated content scripts handle synchronous errors and promise rejections, stop presence/caption observers');
