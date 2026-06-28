import { success, failure, type Result } from '@watchnt/shared';
import type { SettingsStorage } from './interfaces.js';

export class IndexedDBSettingsStorage implements SettingsStorage {
  private dbName = 'watchnt-settings';
  private storeName = 'settings';
  private version = 1;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // In SSR or environments without indexedDB, fail gracefully
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
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
          resolve(success(request.result !== undefined ? request.result : null));
        };

        request.onerror = () => {
          resolve(failure(new Error(`Failed to get setting ${key}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async set<T>(key: string, value: T): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve(success(undefined));
        };

        request.onerror = () => {
          resolve(failure(new Error(`Failed to set setting ${key}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async delete(key: string): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve(success(undefined));
        };

        request.onerror = () => {
          resolve(failure(new Error(`Failed to delete setting ${key}`)));
        };
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
