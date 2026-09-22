import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const state={isRecording:true};const sequence=[];
const sandbox={setTimeout,clearTimeout,FormData,console,chrome:{runtime:{onMessage:{addListener(){}},sendMessage:async message=>{
 if(message.type==='CAPTURE_STATE'){await new Promise(r=>setTimeout(r,20));Object.assign(state,message.payload);sequence.push(message.payload.pipelineStatus);}
 if(message.type==='RECORDING_UPLOADED'){Object.assign(state,{isUploading:false,pipelineStatus:'COMPLETED'});sequence.push('COMPLETED');}
}}},fetch:async()=>({ok:true,json:async()=>({})})};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('extension/offscreen.js','utf8'),sandbox);
vm.runInContext(`active=true;meetingId='fixture';segments=[{text:'tail speech'}];processor={port:{postMessage(){flushed=true;pump();}},disconnect(){}};`,sandbox);
await vm.runInContext('stop()',sandbox);
await new Promise(r=>setTimeout(r,60));
assert.equal(state.pipelineStatus,'COMPLETED');assert.equal(state.isUploading,false);assert.deepEqual(sequence,['TRANSCRIBING','COMPLETED']);
console.log('PASS: stop state persists before synchronous tail flush and cannot overwrite completion');
