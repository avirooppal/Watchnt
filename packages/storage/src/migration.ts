import { success, failure, type Result } from '@watchnt/shared';
import type { MigrationRunner, RelationalStorage } from './interfaces.js';

export interface Migration {
  version: number;
  name: string;
  up(tx: RelationalStorage): Promise<void>;
}

export class DatabaseMigrationRunner implements MigrationRunner {
  private db: RelationalStorage;
  private migrations: Migration[];

  constructor(db: RelationalStorage, migrations: Migration[]) {
    this.db = db;
    // Ensure migrations are sorted by version ascending
    this.migrations = [...migrations].sort((a, b) => a.version - b.version);
  }

  private async ensureMigrationTable(): Promise<Result<void>> {
    return this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getCurrentVersion(): Promise<Result<number>> {
    const tableRes = await this.ensureMigrationTable();
    if (!tableRes.ok) return failure(tableRes.error);

    const queryRes = await this.db.query<{ version: number }>(`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
    `);

    if (!queryRes.ok) return failure(queryRes.error);

    if (queryRes.value.length === 0) {
      return success(0);
    }
    return success(queryRes.value[0].version);
  }

  async runMigrations(): Promise<Result<void>> {
    const versionRes = await this.getCurrentVersion();
    if (!versionRes.ok) return failure(versionRes.error);

    const currentVersion = versionRes.value;

    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    for (const migration of pendingMigrations) {
      const txRes = await this.db.transaction(async (tx) => {
        await migration.up(tx);
        await tx.execute(
          `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
          [migration.version, migration.name]
        );
      });

      if (!txRes.ok) {
        return failure(new Error(`Migration ${migration.version} (${migration.name}) failed: ${txRes.error.message}`));
      }
    }

    return success(undefined);
  }
}
