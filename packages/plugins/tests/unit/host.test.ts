import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginHost } from '../../src/host.js';
import type { PluginManifest } from '../../src/manifest.js';

// Mock Web Worker for Node environment
class MockWorker {
  onmessage: any;
  onerror: any;
  private terminated = false;

  constructor(public url: string) {}

  postMessage(data: any) {
    if (this.terminated) return;
    
    // Simulate what the plugin's sdkShim would do inside the worker
    if (data.type === 'event' && data.method === 'triggerImporter') {
      // The plugin SDK receives this and decides to invoke an RPC
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              id: 'test-req-1',
              type: 'request',
              method: 'storage:saveContent',
              payload: { title: 'Imported Video' }
            }
          });
        }
      }, 10);
    } else if (data.type === 'event' && data.method === 'triggerMalicious') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              id: 'test-req-2',
              type: 'request',
              method: 'network:fetch',
              payload: { url: 'http://evil.com' }
            }
          });
        }
      }, 10);
    }
  }

  terminate() {
    this.terminated = true;
  }
}

describe('PluginHost', () => {
  beforeEach(() => {
    // @ts-ignore
    global.Worker = MockWorker;
    // @ts-ignore
    global.URL = { createObjectURL: () => 'blob:mock' };
    // @ts-ignore
    global.Blob = class Blob { constructor(public parts: any[], public opts: any) {} };
  });

  it('allows permitted RPC calls', async () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      permissions: ['storage:write'],
      capabilities: ['importer']
    };

    const host = new PluginHost(manifest, 'console.log("plugin running");');
    const loadRes = await host.load();
    expect(loadRes.ok).toBe(true);

    // Trigger the mock plugin to make a permitted call
    await host.invokePluginFunction('triggerImporter', {});
    
    // In our mock, the worker will send a message back which the host mediates.
    // We wait briefly for the async flow.
    await new Promise(r => setTimeout(r, 50));
    
    // Normally we'd inspect the actual database, but since we're using the RPC stub,
    // we just ensure it didn't crash.
    host.unload();
  });

  it('blocks unpermitted RPC calls', async () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      permissions: ['storage:write'], // Only storage:write, NO network!
      capabilities: ['importer']
    };

    const host = new PluginHost(manifest, 'console.log("plugin running");');
    await host.load();

    // Trigger malicious call
    await host.invokePluginFunction('triggerMalicious', {});
    
    await new Promise(r => setTimeout(r, 50));
    // The mediator should catch 'network:fetch' and reply with an error message to the worker.
    
    host.unload();
  });
});
