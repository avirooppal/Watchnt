import type { RelationalStorage } from '@watchnt/storage';
import { DatabaseMigrationRunner } from '@watchnt/storage';
import { ContentRepository } from './repositories/content.js';
import { NoteRepository } from './repositories/notes.js';
import { KnowledgeRepository } from './repositories/knowledge.js';
import { VectorRepository } from './repositories/vector.js';
import { initialSchemaMigration, noteAndKnowledgeSchemaMigration, vectorSchemaMigration } from './schema.js';
import { type Result } from '@watchnt/shared';

export class ModelFacade {
  public content: ContentRepository;
  public notes: NoteRepository;
  public knowledge: KnowledgeRepository;
  public vectors: VectorRepository;
  
  constructor(private db: RelationalStorage) {
    this.content = new ContentRepository(this.db);
    this.notes = new NoteRepository(this.db);
    this.knowledge = new KnowledgeRepository(this.db);
    this.vectors = new VectorRepository(this.db);
  }

  async migrate(): Promise<Result<void>> {
    const runner = new DatabaseMigrationRunner(this.db, [
      initialSchemaMigration,
      noteAndKnowledgeSchemaMigration,
      vectorSchemaMigration
    ]);
    return runner.runMigrations();
  }
}
