import { describe, it, expect, beforeEach } from 'vitest';
import { VectorRepository } from '../../src/repositories/vector.js';
import { ContentRepository } from '../../src/repositories/content.js';
import { initialSchemaMigration, noteAndKnowledgeSchemaMigration, vectorSchemaMigration } from '../../src/schema.js';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage, DatabaseMigrationRunner } from '@watchnt/storage';
import { createContentId, isSuccess } from '@watchnt/shared';

describe('VectorRepository', () => {
  let db: PGLiteRelationalStorage;
  let repo: VectorRepository;
  const contentId = createContentId('test-vid-vec');

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://vector_test_' + Math.random());
    const facade = new ModelFacade(db);
    const migRes = await facade.migrate();
    if (!isSuccess(migRes)) throw migRes.error;
    
    
    // Create base content since foreign key requires it
    const contentRepo = new ContentRepository(db);
    await contentRepo.create({ id: contentId, type: 'video', createdAt: Date.now() as any } as any);
    
    repo = new VectorRepository(db);
  });

  it('adds and searches vector embeddings', async () => {
    // Generate some mock 384-dimensional vectors
    const vecA = new Array(384).fill(0);
    vecA[0] = 1; // Pure X direction

    const vecB = new Array(384).fill(0);
    vecB[1] = 1; // Pure Y direction (orthogonal to vecA)

    const vecC = new Array(384).fill(0);
    vecC[0] = 0.9;
    vecC[1] = 0.1; // Close to vecA

    await repo.addEmbedding({ id: 'emb1', content_id: contentId, embedding: vecA });
    await repo.addEmbedding({ id: 'emb2', content_id: contentId, embedding: vecB });
    await repo.addEmbedding({ id: 'emb3', content_id: contentId, embedding: vecC });

    // Search for something close to vecA
    const searchRes = await repo.search(vecA, 2);
    expect(isSuccess(searchRes)).toBe(true);
    if (isSuccess(searchRes)) {
      expect(searchRes.value.length).toBe(2);
      
      // emb1 should be exact match
      expect(searchRes.value[0].id).toBe('emb1');
      expect(searchRes.value[0].similarity).toBeCloseTo(1.0, 4);

      // emb3 should be second best
      expect(searchRes.value[1].id).toBe('emb3');
      expect(searchRes.value[1].similarity).toBeGreaterThan(0.5);
    }
  });

  it('deletes embeddings by content_id', async () => {
    const vec = new Array(384).fill(0.5);
    await repo.addEmbedding({ id: 'emb_del', content_id: contentId, embedding: vec });

    let searchRes = await repo.search(vec, 1);
    if (isSuccess(searchRes)) expect(searchRes.value.length).toBe(1);

    const delRes = await repo.deleteByContentId(contentId);
    expect(isSuccess(delRes)).toBe(true);

    searchRes = await repo.search(vec, 1);
    if (isSuccess(searchRes)) expect(searchRes.value.length).toBe(0);
  });
});
