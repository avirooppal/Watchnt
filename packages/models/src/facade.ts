import type { RelationalStorage } from '@watchnt/storage';
import { DatabaseMigrationRunner } from '@watchnt/storage';
import { ContentRepository } from './repositories/content.js';
import { NoteRepository } from './repositories/notes.js';
import { KnowledgeRepository } from './repositories/knowledge.js';
import { VectorRepository } from './repositories/vector.js';
import { GraphRepository } from './repositories/graph.js';
import { BacklinkRepository } from './repositories/backlinks.js';
import { FlashcardRepository } from './repositories/flashcards.js';
import { initialSchemaMigration, noteAndKnowledgeSchemaMigration, vectorSchemaMigration, graphSchemaMigration, backlinksSchemaMigration, flashcardsSchemaMigration, hybridSearchSchemaMigration } from './schema.js';
import { type Result } from '@watchnt/shared';

import { NotesService } from './services/notes.js';

export class ModelFacade {
  public content: ContentRepository;
  public notes: NoteRepository;
  public knowledge: KnowledgeRepository;
  public vectors: VectorRepository;
  public graph: GraphRepository;
  public backlinks: BacklinkRepository;
  public flashcards: FlashcardRepository;
  
  public notesService: NotesService;
  
  constructor(private db: RelationalStorage) {
    this.content = new ContentRepository(this.db);
    this.notes = new NoteRepository(this.db);
    this.knowledge = new KnowledgeRepository(this.db);
    this.vectors = new VectorRepository(this.db);
    this.graph = new GraphRepository(this.db);
    this.backlinks = new BacklinkRepository(this.db);
    this.flashcards = new FlashcardRepository(this.db);

    this.notesService = new NotesService(this);
  }

  async migrate(): Promise<Result<void>> {
    const runner = new DatabaseMigrationRunner(this.db, [
      initialSchemaMigration,
      noteAndKnowledgeSchemaMigration,
      vectorSchemaMigration,
      graphSchemaMigration,
      backlinksSchemaMigration,
      flashcardsSchemaMigration,
      hybridSearchSchemaMigration
    ]);
    return runner.runMigrations();
  }
}
