import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../src/MemoryStore';
import { VectorSearch } from '../src/VectorSearch';
import { EmbeddingService } from '@watchnt/embeddings';

class MockEmbeddingService implements EmbeddingService {
    // Generate predictable vectors based on the text string for testing
    async embed(text: string): Promise<number[]> {
        if (text.includes('coffee')) return [1, 0, 0];
        if (text.includes('tea')) return [0.9, 0.1, 0];
        if (text.includes('computer')) return [0, 1, 0];
        return [0, 0, 1];
    }
}

describe('VectorSearch', () => {
    it('should calculate identical vectors as 1', () => {
        const score = VectorSearch.cosineSimilarity([1, 0, 0], [1, 0, 0]);
        expect(score).toBeCloseTo(1);
    });

    it('should calculate orthogonal vectors as 0', () => {
        const score = VectorSearch.cosineSimilarity([1, 0, 0], [0, 1, 0]);
        expect(score).toBeCloseTo(0);
    });
});

describe('MemoryStore', () => {
    it('should store and retrieve memories with embeddings', async () => {
        const store = new InMemoryStore(new MockEmbeddingService());
        
        await store.add({
            id: 'm-1',
            text: 'User likes coffee',
            sourceMeetingId: 'meet-1',
            timestamp: Date.now()
        });
        
        const list = await store.list();
        expect(list.length).toBe(1);
        expect(list[0].vector).toBeDefined();
        expect(list[0].vector?.length).toBe(3);
    });

    it('should search memories by semantic similarity', async () => {
        const store = new InMemoryStore(new MockEmbeddingService());
        
        await store.add({ id: 'm-1', text: 'User likes coffee', sourceMeetingId: 'meet-1', timestamp: 1 });
        await store.add({ id: 'm-2', text: 'User uses a computer', sourceMeetingId: 'meet-1', timestamp: 2 });
        
        // Searching for coffee should match m-1 heavily and m-2 minimally
        const results = await store.search('Give me coffee', 2);
        
        expect(results.length).toBe(2);
        expect(results[0].memory.id).toBe('m-1');
        expect(results[0].score).toBe(1); // [1,0,0] vs [1,0,0]
        
        expect(results[1].memory.id).toBe('m-2');
        expect(results[1].score).toBe(0); // [1,0,0] vs [0,1,0]
    });
});
