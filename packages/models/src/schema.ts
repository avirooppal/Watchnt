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

export const noteAndKnowledgeSchemaMigration: Migration = {
  version: 2,
  name: 'init_notes_knowledge_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        text TEXT NOT NULL,
        timestamp_ms BIGINT,
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE
      )
    `);
    
    await tx.execute(`
      CREATE TABLE knowledge_fragments (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE
      )
    `);

    await tx.execute(`
      CREATE TABLE content_relationships (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (source_id, target_id, type),
        FOREIGN KEY(source_id) REFERENCES content(id) ON DELETE CASCADE,
        FOREIGN KEY(target_id) REFERENCES content(id) ON DELETE CASCADE
      )
    `);
  }
};
