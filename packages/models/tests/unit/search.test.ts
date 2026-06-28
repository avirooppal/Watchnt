import { describe, it, expect, beforeEach } from 'vitest';
import { SearchService } from '../../src/services/search.js';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId, createNoteId, isSuccess } from '@watchnt/shared';

describe('SearchService', () => {
  let db: PGLiteRelationalStorage;
  let facade: ModelFacade;
  let searchService: SearchService;

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://search_test_' + Math.random());
    facade = new ModelFacade(db);
    await facade.migrate();
    searchService = new SearchService(db);
  });

  it('performs cross-repository lookup to return populated search results', async () => {
    const contentId = createContentId('vid-search');
    
    // 1. Create content
    await facade.content.create({
      id: contentId,
      type: 'video',
      createdAt: Date.now() as any,
      title: 'Amazing AI Video'
    } as any);

    // 2. Create knowledge fragment (chunk)
    const fragId = createNoteId('chunk1');
    await facade.knowledge.addFragment({
      id: fragId,
      content_id: contentId,
      type: 'chunk',
      content: 'The quick brown fox jumps over the lazy dog.'
    });

    // 3. Create embedding for the fragment
    const vecA = new Array(384).fill(0.1);
    await facade.vectors.addEmbedding({
      id: 'vec1',
      content_id: contentId,
      fragment_id: fragId,
      embedding: vecA
    });

    // 4. Search using SearchService
    // Query with an exact matching vector should yield high similarity
    const searchRes = await searchService.searchSimilar(vecA, 5);
    expect(isSuccess(searchRes)).toBe(true);
    
    if (isSuccess(searchRes)) {
      expect(searchRes.value.length).toBe(1);
      const result = searchRes.value[0];
      
      expect(result.similarity).toBeCloseTo(1.0, 4);
      expect(result.fragment_id).toBe(fragId);
      expect(result.fragment_text).toBe('The quick brown fox jumps over the lazy dog.');
      expect(result.content_id).toBe(contentId);
      expect(result.content_title).toBe('Amazing AI Video');
    }
  });
});
