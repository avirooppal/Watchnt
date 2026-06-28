import { describe, it, expect } from 'vitest';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId, createTimestamp, isSuccess } from '@watchnt/shared';

describe('ModelFacade', () => {
  it('manages the complete object lifecycle across repositories', async () => {
    const db = new PGLiteRelationalStorage('memory://facade_test_' + Math.random());
    const facade = new ModelFacade(db);

    // 1. Migrate all schemas
    const migRes = await facade.migrate();
    expect(isSuccess(migRes)).toBe(true);

    // 2. Create Content
    const contentId = createContentId('vid-facade');
    const createRes = await facade.content.create({
      id: contentId,
      type: 'video',
      createdAt: createTimestamp(0),
      title: 'Facade Test Video'
    } as any);
    expect(isSuccess(createRes)).toBe(true);

    // 3. Create Note
    const noteRes = await facade.notes.create({
      id: 'note-f1' as any,
      content_id: contentId,
      text: 'Facade note'
    });
    expect(isSuccess(noteRes)).toBe(true);

    // 4. Create Knowledge Fragment
    const fragRes = await facade.knowledge.addFragment({
      id: 'frag-f1' as any,
      content_id: contentId,
      type: 'summary',
      content: 'Facade summary'
    });
    expect(isSuccess(fragRes)).toBe(true);

    // 5. Create Embeddings (linked to content & fragment)
    const vecA = new Array(384).fill(0.1);
    const vecRes = await facade.vectors.addEmbedding({
      id: 'vec-f1',
      content_id: contentId,
      fragment_id: 'frag-f1' as any,
      embedding: vecA
    });
    expect(isSuccess(vecRes)).toBe(true);

    // 6. Delete Content (Should cascade to everything else)
    const delRes = await facade.content.delete(contentId);
    expect(isSuccess(delRes)).toBe(true);

    // 7. Verify Cascading Deletion
    const getNotes = await facade.notes.getByContentId(contentId);
    if (isSuccess(getNotes)) expect(getNotes.value.length).toBe(0);

    const getFrags = await facade.knowledge.getFragmentsByContentId(contentId);
    if (isSuccess(getFrags)) expect(getFrags.value.length).toBe(0);

    // Even embeddings should be gone
    const getVec = await facade.vectors.search(vecA, 1);
    if (isSuccess(getVec)) expect(getVec.value.length).toBe(0);
  }, 15000);
});
