import { describe, it, expect, beforeEach } from 'vitest';
import { NoteRepository } from '../../src/repositories/notes.js';
import { ContentRepository } from '../../src/repositories/content.js';
import { initialSchemaMigration, noteAndKnowledgeSchemaMigration } from '../../src/schema.js';
import { PGLiteRelationalStorage, DatabaseMigrationRunner } from '@watchnt/storage';
import { createContentId, isSuccess } from '@watchnt/shared';

describe('NoteRepository', () => {
  let db: PGLiteRelationalStorage;
  let repo: NoteRepository;
  const contentId = createContentId('test-vid');

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://notes_test_' + Math.random());
    const runner = new DatabaseMigrationRunner(db, [initialSchemaMigration, noteAndKnowledgeSchemaMigration]);
    await runner.runMigrations();
    
    // Create base content since foreign key requires it
    const contentRepo = new ContentRepository(db);
    await contentRepo.create({ id: contentId, type: 'video', createdAt: Date.now() as any } as any);
    
    repo = new NoteRepository(db);
  });

  it('creates and fetches notes', async () => {
    const createRes = await repo.create({
      id: 'note-1' as any,
      content_id: contentId,
      text: 'This is a test note'
    });
    expect(isSuccess(createRes)).toBe(true);

    const getRes = await repo.getByContentId(contentId);
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes)) {
      expect(getRes.value.length).toBe(1);
      expect(getRes.value[0].text).toBe('This is a test note');
    }
  });

  it('updates a note', async () => {
    await repo.create({ id: 'note-2' as any, content_id: contentId, text: 'Old text' });
    
    const updateRes = await repo.update('note-2' as any, 'New text', 1200);
    expect(isSuccess(updateRes)).toBe(true);

    const getRes = await repo.getByContentId(contentId);
    if (isSuccess(getRes)) {
      const note = getRes.value.find(n => n.id === 'note-2');
      expect(note?.text).toBe('New text');
      expect(note?.timestamp_ms).toBe(1200);
    }
  });
});
