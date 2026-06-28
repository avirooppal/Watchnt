import { describe, it, expect } from 'vitest';
import { DatabaseMigrationRunner, type Migration } from '../../src/migration.js';
import { PGLiteRelationalStorage } from '../../src/pglite.js';
import { isSuccess, isFailure } from '@watchnt/shared';

describe('DatabaseMigrationRunner', () => {
  it('runs pending migrations sequentially and records them', async () => {
    const db = new PGLiteRelationalStorage('memory://mig1');
    
    const migrations: Migration[] = [
      {
        version: 1,
        name: 'init_users',
        up: async (tx) => {
          await tx.execute('CREATE TABLE users (id SERIAL PRIMARY KEY)');
        }
      },
      {
        version: 2,
        name: 'add_name',
        up: async (tx) => {
          await tx.execute('ALTER TABLE users ADD COLUMN name TEXT');
        }
      }
    ];

    const runner = new DatabaseMigrationRunner(db, migrations);
    
    // Initial version should be 0
    let verRes = await runner.getCurrentVersion();
    expect(isSuccess(verRes) && verRes.value === 0).toBe(true);

    // Run migrations
    const runRes = await runner.runMigrations();
    expect(isSuccess(runRes)).toBe(true);

    // Version should be 2
    verRes = await runner.getCurrentVersion();
    expect(isSuccess(verRes) && verRes.value === 2).toBe(true);

    // Verify schema changes applied
    const testRes = await db.execute("INSERT INTO users (name) VALUES ('Test')");
    expect(isSuccess(testRes)).toBe(true);
  });

  it('rolls back completely if a migration fails', async () => {
    const db = new PGLiteRelationalStorage('memory://mig2');
    
    const migrations: Migration[] = [
      {
        version: 1,
        name: 'init_logs',
        up: async (tx) => {
          await tx.execute('CREATE TABLE logs (msg TEXT)');
        }
      },
      {
        version: 2,
        name: 'fail_migration',
        up: async (tx) => {
          await tx.execute('CREATE TABLE foo (id INT)');
          throw new Error('Something went wrong!');
        }
      }
    ];

    const runner = new DatabaseMigrationRunner(db, migrations);
    
    const runRes = await runner.runMigrations();
    expect(isFailure(runRes)).toBe(true);
    if (isFailure(runRes)) {
      expect(runRes.error.message).toContain('Migration 2 (fail_migration) failed');
    }

    // Version should be stuck at 1 since version 2 failed and rolled back
    const verRes = await runner.getCurrentVersion();
    expect(isSuccess(verRes) && verRes.value === 1).toBe(true);

    // `logs` from version 1 should exist
    const logCheck = await db.execute('SELECT * FROM logs');
    expect(isSuccess(logCheck)).toBe(true);
    
    // `foo` from version 2 should NOT exist
    const fooCheck = await db.execute('SELECT * FROM foo');
    expect(isFailure(fooCheck)).toBe(true); // Table doesn't exist error
  });
});
