
import { EmbeddingService } from '@watchnt/embeddings';
import { MemoryEntity, MemoryStore } from '@watchnt/memory';

export interface SearchResult {
    memory: MemoryEntity;
    score: number;
}

export class SemanticSearchService {
    constructor(
        private store: MemoryStore,
        private embedder: EmbeddingService
    ) {}

    private cosineSimilarity(a: number[], b: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(query: string, limit: number = 5): Promise<SearchResult[]> {
        const queryVector = await this.embedder.embed(query);
        const memories = await this.store.list();
        
        const results = memories
            .filter(m => m.vector !== undefined)
            .map(m => ({
                memory: m,
                score: this.cosineSimilarity(queryVector, m.vector!)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
            
        return results;
    }
}
