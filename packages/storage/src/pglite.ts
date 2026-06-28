import { PGlite } from '@electric-sql/pglite';
import { success, failure, type Result } from '@watchnt/shared';
import type { RelationalStorage } from './interfaces.js';

// We abstract the exact type so we can wrap both PGlite instances and Transaction instances
interface Queryable {
  query<T>(query: string, params?: any[]): Promise<{ rows: T[] }>;
}

export class PGLiteRelationalStorage implements RelationalStorage {
  private db: Queryable;
  private rootDb?: PGlite;
  private isTransaction: boolean;

  constructor(dataDir?: string, txInstance?: Queryable) {
    if (txInstance) {
      this.db = txInstance;
      this.isTransaction = true;
    } else {
      this.rootDb = new PGlite(dataDir || 'idb://watchnt-db');
      this.db = this.rootDb;
      this.isTransaction = false;
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<Result<T[]>> {
    try {
      const result = await this.db.query<T>(sql, params as any[]);
      return success(result.rows as T[]);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<Result<void>> {
    try {
      await this.db.query(sql, params as any[]);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async transaction<T>(callback: (tx: RelationalStorage) => Promise<T>): Promise<Result<T>> {
    if (this.isTransaction || !this.rootDb) {
      return failure(new Error('Nested transactions are not supported'));
    }

    try {
      const result = await this.rootDb.transaction<T>(async (tx) => {
        const txStorage = new PGLiteRelationalStorage(undefined, tx);
        return await callback(txStorage);
      });
      return success(result);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
