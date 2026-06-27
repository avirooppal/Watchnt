
import { describe, it, expect } from 'vitest';
import { SemanticSearchService } from '../src/SearchService';
import { InMemoryStore } from '@watchnt/memory';
import { MockEmbeddingService } from '@watchnt/embeddings';

describe('SearchService', () => {
    it('should return semantically similar results', async () => {
        const embedder = new MockEmbeddingService();
        const store = new InMemoryStore(embedder);
        
        await store.add({ id: '1', text: 'Coffee is great', sourceMeetingId: 'meet-1', timestamp: 0 });
        
        const searcher = new SemanticSearchService(store, embedder);
        const results = await searcher.search('coffee');
        
        expect(results.length).toBe(1);
        expect(results[0].memory.text).toContain('Coffee');
        expect(results[0].score).toBeGreaterThan(0.9); // Identical mock vectors yield 1.0
    });
});
