import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexedDBSettingsStorage } from '../../src/settings.js';
import { isSuccess, isFailure } from '@watchnt/shared';

describe('IndexedDBSettingsStorage', () => {
  beforeEach(() => {
    // Basic mock of indexedDB for unit testing logic flow
    const store = new Map();
    const mockDB = {
      objectStoreNames: { contains: () => true },
      transaction: () => ({
        objectStore: () => ({
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
          }
        })
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

  it('sets and gets settings successfully', async () => {
    const storage = new IndexedDBSettingsStorage();
    
    // Set a setting
    const setRes = await storage.set('theme', 'dark');
    expect(isSuccess(setRes)).toBe(true);
    
    // Get the setting
    const getRes = await storage.get<string>('theme');
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes)) {
      expect(getRes.value).toBe('dark');
    }
  });

  it('deletes settings successfully', async () => {
    const storage = new IndexedDBSettingsStorage();
    
    await storage.set('model', 'llama-small');
    await storage.delete('model');
    
    const getRes = await storage.get('model');
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes)) {
      expect(getRes.value).toBeNull();
    }
  });

  it('fails gracefully when IndexedDB is missing', async () => {
    vi.stubGlobal('window', {}); // No indexedDB
    
    const storage = new IndexedDBSettingsStorage();
    const res = await storage.get('theme');
    
    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toBe('IndexedDB is not available in this environment');
    }
  });
});
