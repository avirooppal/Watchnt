import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexedDBAICacheStorage } from '../../src/cache.js';
import { isSuccess, isFailure } from '@watchnt/shared';

describe('IndexedDBAICacheStorage', () => {
  let store: Map<string, any>;

  beforeEach(() => {
    store = new Map();
    
    // Complex mock to support indexes, cursors and counting
    const mockIndex = {
      openCursor: () => {
        // Sort by timestamp
        const sortedKeys = Array.from(store.keys()).sort((a, b) => {
          return store.get(a).timestamp - store.get(b).timestamp;
        });
        
        let i = 0;
        const req: any = {};
        
        const next = () => {
          if (i < sortedKeys.length) {
            const key = sortedKeys[i++];
            req.result = {
              key: store.get(key).timestamp,
              primaryKey: key,
              value: store.get(key),
              delete: () => { store.delete(key); },
              continue: () => { setTimeout(next, 0); }
            };
          } else {
            req.result = null;
          }
          if (req.onsuccess) req.onsuccess({ target: req });
        };
        setTimeout(next, 0);
        return req;
      }
    };

    const mockStore = {
      createIndex: vi.fn(),
      index: () => mockIndex,
      get: (key: string) => {
        const req: any = { result: store.get(key) };
        setTimeout(() => req.onsuccess && req.onsuccess(), 0);
        return req;
      },
      put: (val: any, key: string) => {
        store.set(key, val);
        const req: any = {};
        setTimeout(() => req.onsuccess && req.onsuccess(), 0);
        return req;
      },
      delete: (key: string) => {
        store.delete(key);
        const req: any = {};
        setTimeout(() => req.onsuccess && req.onsuccess(), 0);
        return req;
      },
      count: () => {
        const req: any = { result: store.size };
        setTimeout(() => req.onsuccess && req.onsuccess(), 0);
        return req;
      },
      openCursor: () => {
        const keys = Array.from(store.keys());
        let i = 0;
        const req: any = {};
        
        const next = () => {
          if (i < keys.length) {
            const key = keys[i++];
            req.result = {
              key,
              value: store.get(key),
              delete: () => { store.delete(key); },
              continue: () => { setTimeout(next, 0); }
            };
          } else {
            req.result = null;
          }
          if (req.onsuccess) req.onsuccess({ target: req });
        };
        setTimeout(next, 0);
        return req;
      }
    };

    const mockDB = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => mockStore,
      transaction: () => ({
        objectStore: () => mockStore
      })
    };

    vi.stubGlobal('window', {
      indexedDB: {
        open: () => {
          const req: any = { result: mockDB };
          setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
          return req;
        }
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets and gets cache entries', async () => {
    const cache = new IndexedDBAICacheStorage();
    
    await cache.set('prompt-hash-1', { summary: 'test' });
    
    const res = await cache.get<{ summary: string }>('prompt-hash-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res) && res.value) {
      expect(res.value.summary).toBe('test');
    }

    const miss = await cache.get('non-existent');
    expect(isSuccess(miss) && miss.value === null).toBe(true);
  });

  it('invalidates cache by prefix', async () => {
    const cache = new IndexedDBAICacheStorage();
    
    await cache.set('model_llama_chunk_1', { emb: [1] });
    await cache.set('model_llama_chunk_2', { emb: [2] });
    await cache.set('model_mistral_chunk_1', { emb: [3] });

    await cache.invalidate('model_llama_');

    const res1 = await cache.get('model_llama_chunk_1');
    expect(isSuccess(res1) && res1.value === null).toBe(true);
    
    const res2 = await cache.get('model_mistral_chunk_1');
    expect(isSuccess(res2) && res2.value !== null).toBe(true);
  });

  it('evicts oldest entries when maxEntries is exceeded', async () => {
    const cache = new IndexedDBAICacheStorage(2); // Max 2 entries
    
    await cache.set('k1', 'v1');
    // Artificially modify timestamp to be older so we can guarantee order
    store.get('k1').timestamp = 1000;
    
    await cache.set('k2', 'v2');
    store.get('k2').timestamp = 2000;
    
    // Setting 3rd should trigger eviction of the oldest ('k1')
    await cache.set('k3', 'v3');
    store.get('k3').timestamp = 3000;

    // Need a small delay because eviction runs asynchronously in set()
    await new Promise(r => setTimeout(r, 10));

    const res1 = await cache.get('k1');
    expect(isSuccess(res1) && res1.value === null).toBe(true);

    const res2 = await cache.get('k2');
    expect(isSuccess(res2) && res2.value === 'v2').toBe(true);
    
    const res3 = await cache.get('k3');
    expect(isSuccess(res3) && res3.value === 'v3').toBe(true);
  });
});
