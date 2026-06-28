import { success, failure, type Result } from '@watchnt/shared';
import type { AICacheStorage } from './interfaces.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class IndexedDBAICacheStorage implements AICacheStorage {
  private dbName = 'watchnt-ai-cache';
  private storeName = 'cache';
  private version = 1;
  private dbPromise: Promise<IDBDatabase>;
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create store with an index on timestamp for eviction
          const store = db.createObjectStore(this.storeName);
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async get<T>(key: string): Promise<Result<T | null>> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result !== undefined) {
            const entry = request.result as CacheEntry<T>;
            resolve(success(entry.value));
          } else {
            resolve(success(null));
          }
        };

        request.onerror = () => {
          resolve(failure(new Error(`Failed to get cache key ${key}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async set<T>(key: string, value: T): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      
      // Before setting, let's just do a basic eviction if needed.
      // We do it asynchronously to not block the current set operation too much.
      // In a real high-throughput system we'd manage this differently.
      this.evictIfNeeded();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const entry: CacheEntry<T> = {
          value,
          timestamp: Date.now()
        };

        const request = store.put(entry, key);

        request.onsuccess = () => {
          resolve(success(undefined));
        };

        request.onerror = () => {
          resolve(failure(new Error(`Failed to set cache key ${key}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async invalidate(keyPrefix: string): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // Open cursor to delete matching prefixes
        const cursorReq = store.openCursor();
        
        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const key = String(cursor.key);
            if (key.startsWith(keyPrefix)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            // Done iterating
            resolve(success(undefined));
          }
        };

        cursorReq.onerror = () => {
          resolve(failure(new Error(`Failed to invalidate cache prefix ${keyPrefix}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async evictIfNeeded(): Promise<void> {
    try {
      const db = await this.dbPromise;
      
      // Count items
      const countReq = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (countReq <= this.maxEntries) {
        return;
      }

      const numToEvict = countReq - this.maxEntries;
      
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const index = store.index('timestamp');
        
        // Open cursor on timestamp index (ascending order = oldest first)
        const cursorReq = index.openCursor();
        let evicted = 0;
        
        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && evicted < numToEvict) {
            cursor.delete();
            evicted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        cursorReq.onerror = () => reject(cursorReq.error);
      });
    } catch (e) {
      console.warn('Failed to evict cache entries', e);
    }
  }
}
