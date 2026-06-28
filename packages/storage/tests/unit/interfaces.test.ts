import { describe, it, expect } from 'vitest';
import type { SettingsStorage, BlobStorage, RelationalStorage } from '../../src/interfaces.js';
import { success, failure, isSuccess } from '@watchnt/shared';

describe('Storage Interfaces (In-Memory Adapters)', () => {
  it('SettingsStorage interface can be implemented in memory', async () => {
    class InMemorySettings implements SettingsStorage {
      private map = new Map<string, any>();
      
      async get<T>(key: string) {
        return success((this.map.get(key) as T) ?? null);
      }
      async set<T>(key: string, value: T) {
        this.map.set(key, value);
        return success(undefined);
      }
      async delete(key: string) {
        this.map.delete(key);
        return success(undefined);
      }
    }
    
    const storage: SettingsStorage = new InMemorySettings();
    await storage.set('theme', 'dark');
    
    const result = await storage.get<string>('theme');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('dark');
    }
  });

  it('BlobStorage interface can be implemented in memory', async () => {
    class InMemoryBlob implements BlobStorage {
      private blobs = new Map<string, ArrayBuffer>();
      
      async write(path: string, buffer: ArrayBuffer) {
        this.blobs.set(path, buffer);
        return success(undefined);
      }
      async read(path: string) {
        const buf = this.blobs.get(path);
        if (!buf) return failure(new Error('Not found'));
        return success(buf);
      }
      async delete(path: string) {
        this.blobs.delete(path);
        return success(undefined);
      }
      async exists(path: string) {
        return success(this.blobs.has(path));
      }
    }
    
    const storage: BlobStorage = new InMemoryBlob();
    const buffer = new ArrayBuffer(8);
    
    await storage.write('test.bin', buffer);
    const exists = await storage.exists('test.bin');
    expect(isSuccess(exists) && exists.value).toBe(true);
  });

  it('RelationalStorage interface can be implemented via mock', async () => {
    class MockDB implements RelationalStorage {
      async query<T>(sql: string, params?: unknown[]) {
        if (sql === 'SELECT 1') return success([{ 1: 1 } as T]);
        return success([] as T[]);
      }
      async execute(sql: string, params?: unknown[]) {
        return success(undefined);
      }
      async transaction<T>(callback: (tx: RelationalStorage) => Promise<T>) {
        return success(await callback(this));
      }
    }
    
    const db: RelationalStorage = new MockDB();
    const res = await db.query<{1: number}>('SELECT 1');
    expect(isSuccess(res) && res.value[0]['1']).toBe(1);
  });
});
