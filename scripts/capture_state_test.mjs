import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from '../extension/node_modules/typescript/lib/typescript.js';

const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', 'HEAD:extension/src/background/index.ts'], {encoding:'utf8'})
  : fs.readFileSync('extension/src/background/index.ts', 'utf8');
const code = ts.transpile(source.replace(/^import .*;\r?\n/gm,''), {target:ts.ScriptTarget.ES2022});
const state = {};
let requests = 0, respond = async () => ({status:'RECORDING'});
const event = () => ({addListener(){}});
const sandbox = {setNativeHandler(){},nativeRequest:async()=>{throw Error("Browser capture must not invoke native recorder");},console, AbortSignal, setTimeout:()=>0, clearTimeout,
  fetch: async () => {requests++; return {ok:true, json:()=>respond()};},
  chrome: {
    runtime: {sendMessage:async()=>({ok:true}),getURL:path=>"chrome-extension://test/"+path,onInstalled:event(),onMessage:event(),OnInstalledReason:{INSTALL:'install'}},
    storage: {local: {
      get: async (keys, callback) => {const result={...state}; callback?.(result); return result;},
      set: async values => Object.assign(state,values),
      remove:async keys => {for(const key of typeof keys === "string" ? [keys] : keys) delete state[key];},
    }},
    alarms: {onAlarm:event(),create:async()=>{},clear:async()=>{}},
    offscreen:{hasDocument:async()=>true},
    tabs:{sendMessage:async()=>({ok:true}),onRemoved:event(),create:async()=>({id:77}),update:async()=>({}),get:async()=>({id:42}),query:async()=>[{id:42,url:'https://meet.google.com/test'}]},
  },
};
vm.createContext(sandbox);
vm.runInContext(code,sandbox);
await new Promise(resolve=>setImmediate(resolve));

// Reopening the popup after capture fails must not reinterpret backend RECORDING as saving.
Object.assign(state,{currentMeetingId:'one',recoveryMeetingId:'one',isRecording:false,isUploading:false,pipelineStatus:'FAILED',captureError:'Storage unavailable'});
await vm.runInContext('pollPipelineStatus("one")',sandbox);
assert.equal(state.isUploading,false);
assert.equal(state.pipelineStatus,'FAILED');
assert.equal(state.captureError,'Storage unavailable');
assert.equal(requests,0);

// Old alarms must not poll an active capture, even if its popup has been closed.
Object.assign(state,{isRecording:true,pipelineStatus:'RECORDING'});
await vm.runInContext('pollPipelineStatus("one")',sandbox);
assert.equal(requests,0);

// A response already in flight cannot overwrite a newly started capture.
delete state.recoveryMeetingId;
Object.assign(state,{isRecording:false,pipelineStatus:'COMPLETED'});
let release;
respond=()=>new Promise(resolve=>{release=resolve;});
const pending=vm.runInContext('pollPipelineStatus("one")',sandbox);
while(!release) await new Promise(resolve=>setImmediate(resolve));
Object.assign(state,{isRecording:true,pipelineStatus:'RECORDING',captureError:''});
release({status:'EXTRACTING_INTELLIGENCE'});
await pending;
assert.equal(state.pipelineStatus,'RECORDING');
assert.equal(state.isUploading,false);

// Repair the false "saving" state left by older builds.
Object.assign(state,{isRecording:false,isUploading:true,pipelineStatus:'RECORDING',recoveryMeetingId:'one'});
await vm.runInContext('reconcileCaptureState()',sandbox);
assert.equal(state.isUploading,false);
assert.equal(state.pipelineStatus,'FAILED');
assert.match(state.captureError,/interrupted/);
// A stale backend must fail before opening a capture stream or claiming recording.
delete state.recoveryMeetingId;
respond=async()=>({status:'OK'});
await vm.runInContext('startRecording()',sandbox);
assert.equal(state.isRecording,false);
assert.match(state.captureError,/Update and restart/);
// Browser capture stays on the original tab, with no picker or native host.
Object.assign(state,{captureError:'',pipelineStatus:'',currentMeetingId:'previous'});
respond=async()=>({video:true});
let capturePayload;
const operations=[];
sandbox.chrome.tabs.create=async()=>{throw Error('Unexpected setup page');};
sandbox.chrome.tabs.sendMessage=async(id,message)=>{assert.equal(id,42);operations.push(message.type);return {ok:true,payload:{sdp:{}}};};
sandbox.chrome.tabCapture={getMediaStreamId:async options=>{assert.equal(options.targetTabId,42);operations.push('stream-id');return 'meeting-tab';}};
sandbox.chrome.runtime.sendMessage=async message=>{operations.push(message.type);if(message.type==='OFFSCREEN_START_RECORDING')capturePayload=message.payload;return {ok:true,payload:{}};};
await vm.runInContext('startRecording()',sandbox);
assert.equal(state.captureMode,'browser');
assert.equal(state.currentMeetingId,'');
assert.equal(capturePayload.streamId,'meeting-tab');
assert.equal(capturePayload.meetingAudio,true);
assert.deepEqual(operations,['PREPARE_MEETING_AUDIO','OFFSCREEN_CONNECT_AUDIO','ANSWER_MEETING_AUDIO','stream-id','OFFSCREEN_START_RECORDING']);
// A denied microphone aborts before tab capture and cleans up both peers.
operations.length=0;
sandbox.chrome.tabs.sendMessage=async(id,message)=>{operations.push(message.type);return {ok:false,error:'Microphone denied'};};
await vm.runInContext('startRecording()',sandbox);
assert.match(state.captureError,/Microphone denied/);
assert.equal(state.isStarting,false);
assert.equal(state.isRecording,false);
assert.deepEqual(operations,['PREPARE_MEETING_AUDIO','OFFSCREEN_DISCONNECT_AUDIO','STOP_MEETING_AUDIO']);
console.log('PASS: state races, browser-only start, short-lived stream acquired last, microphone rejection cleanup');
