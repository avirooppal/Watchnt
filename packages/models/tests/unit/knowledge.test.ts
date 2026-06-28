import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeRepository } from '../../src/repositories/knowledge.js';
import { ContentRepository } from '../../src/repositories/content.js';
import { initialSchemaMigration, noteAndKnowledgeSchemaMigration } from '../../src/schema.js';
import { PGLiteRelationalStorage, DatabaseMigrationRunner } from '@watchnt/storage';
import { createContentId, isSuccess } from '@watchnt/shared';

describe('KnowledgeRepository', () => {
  let db: PGLiteRelationalStorage;
  let repo: KnowledgeRepository;
  const contentId = createContentId('test-article');

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://knowledge_test_' + Math.random());
    const runner = new DatabaseMigrationRunner(db, [initialSchemaMigration, noteAndKnowledgeSchemaMigration]);
    await runner.runMigrations();
    
    // Create base content since foreign key requires it
    const contentRepo = new ContentRepository(db);
    await contentRepo.create({ id: contentId, type: 'article', createdAt: Date.now() as any } as any);
    
    repo = new KnowledgeRepository(db);
  });

  it('stores and retrieves knowledge fragments', async () => {
    const createRes = await repo.addFragment({
      id: 'frag-1' as any,
      content_id: contentId,
      type: 'summary',
      content: 'This is a summary.'
    });
    
    if (!isSuccess(createRes)) console.error(createRes.error);
    expect(isSuccess(createRes)).toBe(true);

    const getRes = await repo.getFragmentsByContentId(contentId);
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes)) {
      expect(getRes.value.length).toBe(1);
      expect(getRes.value[0].type).toBe('summary');
      expect(getRes.value[0].content).toBe('This is a summary.');
    }
  });

  it('retrieves fragments by type', async () => {
    await repo.addFragment({ id: 'f-1' as any, content_id: contentId, type: 'tag', content: 'AI' });
    await repo.addFragment({ id: 'f-2' as any, content_id: contentId, type: 'tag', content: 'ML' });
    await repo.addFragment({ id: 'f-3' as any, content_id: contentId, type: 'summary', content: 'Doc' });

    const getRes = await repo.getFragmentsByType(contentId, 'tag');
    expect(isSuccess(getRes)).toBe(true);
    if (isSuccess(getRes)) {
      expect(getRes.value.length).toBe(2);
      const contents = getRes.value.map(f => f.content);
      expect(contents).toContain('AI');
      expect(contents).toContain('ML');
    }
  });
});
