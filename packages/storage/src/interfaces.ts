import type { Result } from '@watchnt/shared';

// Settings Storage (Key-Value)
export interface SettingsStorage {
  get<T>(key: string): Promise<Result<T | null>>;
  set<T>(key: string, value: T): Promise<Result<void>>;
  delete(key: string): Promise<Result<void>>;
}

// Blob Storage (OPFS abstraction)
export interface BlobStorage {
  write(path: string, buffer: ArrayBuffer): Promise<Result<void>>;
  read(path: string): Promise<Result<ArrayBuffer>>;
  delete(path: string): Promise<Result<void>>;
  exists(path: string): Promise<Result<boolean>>;
}

// Relational Storage (SQLite abstraction)
export interface RelationalStorage {
  query<T>(sql: string, params?: unknown[]): Promise<Result<T[]>>;
  execute(sql: string, params?: unknown[]): Promise<Result<void>>;
  transaction<T>(callback: (tx: RelationalStorage) => Promise<T>): Promise<Result<T>>;
}

// AI Output Cache
export interface AICacheStorage {
  get<T>(key: string): Promise<Result<T | null>>;
  set<T>(key: string, value: T): Promise<Result<void>>;
  invalidate(keyPrefix: string): Promise<Result<void>>;
}

// Migration Runner
export interface MigrationRunner {
  runMigrations(): Promise<Result<void>>;
  getCurrentVersion(): Promise<Result<number>>;
}

// System Health and Deletion
export interface StorageManager {
  checkHealth(): Promise<Result<boolean>>;
  deleteAllData(): Promise<Result<void>>;
}
