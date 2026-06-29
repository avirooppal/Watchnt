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

export const vectorSchemaMigration: Migration = {
  version: 3,
  name: 'init_vector_schema',
  up: async (tx) => {
    await tx.execute(`CREATE EXTENSION IF NOT EXISTS vector`);
    
    await tx.execute(`
      CREATE TABLE embeddings (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        fragment_id TEXT,
        embedding vector(384),
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE,
        FOREIGN KEY(fragment_id) REFERENCES knowledge_fragments(id) ON DELETE CASCADE
      )
    `);
  }
};

export const graphSchemaMigration: Migration = {
  version: 4,
  name: 'init_graph_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE entities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        content_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE
      )
    `);

    await tx.execute(`
      CREATE TABLE graph_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        FOREIGN KEY(source_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY(target_id) REFERENCES entities(id) ON DELETE CASCADE
      )
    `);
  }
};

export const backlinksSchemaMigration: Migration = {
  version: 5,
  name: 'init_backlinks_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE backlinks (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL,
        target_note_name TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        FOREIGN KEY(source_note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);
    
    // Create an index for quick reverse-lookups by target name
    await tx.execute(`
      CREATE INDEX idx_backlinks_target ON backlinks(target_note_name);
    `);
  }
};

export const flashcardsSchemaMigration: Migration = {
  version: 6,
  name: 'init_flashcards_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE flashcard_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        front_template TEXT NOT NULL,
        back_template TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);

    // Insert a default template for basic Q&A
    await tx.execute(`
      INSERT INTO flashcard_templates (id, name, front_template, back_template, created_at)
      VALUES ('tpl-basic-qa', 'Basic Q&A', '{{question}}', '{{answer}}', ${Date.now()})
    `);

    await tx.execute(`
      CREATE TABLE flashcards (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        front_data TEXT NOT NULL,
        back_data TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        next_review_at BIGINT NOT NULL,
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE,
        FOREIGN KEY(template_id) REFERENCES flashcard_templates(id) ON DELETE CASCADE
      )
    `);
  }
};

export const hybridSearchSchemaMigration: Migration = {
  version: 7,
  name: 'init_hybrid_search_schema',
  up: async (tx) => {
    // Add tsvector column to knowledge_fragments
    await tx.execute(`
      ALTER TABLE knowledge_fragments ADD COLUMN fts_vector tsvector;
    `);

    // Create GIN index for fast text search
    await tx.execute(`
      CREATE INDEX idx_knowledge_fragments_fts ON knowledge_fragments USING GIN (fts_vector);
    `);

    // Update existing rows
    await tx.execute(`
      UPDATE knowledge_fragments SET fts_vector = to_tsvector('english', content);
    `);

    // Create a trigger to automatically update fts_vector when content changes
    await tx.execute(`
      CREATE OR REPLACE FUNCTION knowledge_fragments_fts_trigger() RETURNS trigger AS $$
      begin
        new.fts_vector := to_tsvector('english', coalesce(new.content, ''));
        return new;
      end
      $$ LANGUAGE plpgsql;
    `);

    await tx.execute(`
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON knowledge_fragments FOR EACH ROW EXECUTE PROCEDURE knowledge_fragments_fts_trigger();
    `);
  }
};

export const captureSessionSchemaMigration: Migration = {
  version: 8,
  name: 'init_capture_session_schema',
  up: async (tx) => {
    await tx.execute(`
      CREATE TABLE capture_sessions (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_url TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        started_at BIGINT NOT NULL,
        ended_at BIGINT,
        error TEXT,
        metadata TEXT,
        content_id TEXT,
        FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE SET NULL
      )
    `);

    await tx.execute(`
      CREATE TABLE knowledge_assets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        metadata TEXT,
        created_at BIGINT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES capture_sessions(id) ON DELETE CASCADE
      )
    `);
  }
};

