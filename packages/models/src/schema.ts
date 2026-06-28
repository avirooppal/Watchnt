import type { Migration } from '@watchnt/storage';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'init_content_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE content (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        title TEXT,
        mime_type TEXT,
        duration_ms BIGINT,
        file_size BIGINT
      )
    `);
  }
};
