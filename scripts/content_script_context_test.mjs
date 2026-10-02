import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../extension/node_modules/typescript/lib/typescript.js';

const source = fs.readFileSync('extension/src/content/index.tsx', 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

const code = ts.transpile(source, { target: ts.ScriptTarget.ES2022 });

let intervalCleared = false;
let messageSent = false;

const intervals = new Set();
const sandbox = {
  document: {
    getElementById: () => null,
    querySelectorAll: () => [],
    documentElement: { append: () => {} },
    createElement: () => ({ attachShadow: () => ({ append: () => {} }), append: () => {} }),
  },
  window: { addEventListener: () => {} },
  setInterval: (fn, ms) => {
    const id = Symbol('interval');
    intervals.add(id);
    return id;
  },
  clearInterval: (id) => {
    intervals.delete(id);
    intervalCleared = true;
  },
  chrome: {
    runtime: {
      id: 'mock-extension-id',
      sendMessage: () => {
        if (!sandbox.chrome.runtime.id) throw new Error('Extension context invalidated.');
        messageSent = true;
        return Promise.resolve();
      },
      onMessage: { addListener: () => {} },
    },
    storage: {
      local: { get: async () => ({}) },
      onChanged: { addListener: () => {} },
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

assert.equal(intervals.size, 1);

// Now simulate extension context invalidation
delete sandbox.chrome.runtime.id;

// Trigger the reportMeeting interval function
vm.runInContext('reportMeeting()', sandbox);

// Interval should be cleared and no uncaught error thrown
assert.equal(intervals.size, 0);
assert.equal(intervalCleared, true);

console.log('PASS: content script cleanly terminates intervals and suppresses errors on extension context invalidation');
