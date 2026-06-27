import { MemoryEntity } from './MemoryEntity';
import { EmbeddingService } from '@watchnt/embeddings';
import { VectorSearch } from './VectorSearch';

export interface SearchResult {
    memory: MemoryEntity;
    score: number;
}

export interface MemoryStore {
    add(memory: MemoryEntity): Promise<void>;
    list(): Promise<MemoryEntity[]>;
    search(query: string, topK?: number): Promise<SearchResult[]>;
}

export class InMemoryStore implements MemoryStore {
    private memories: MemoryEntity[] = [];

    constructor(private embeddingService: EmbeddingService) {}

    async add(memory: MemoryEntity): Promise<void> {
        if (!memory.vector) {
            memory.vector = await this.embeddingService.embed(memory.text);
        }
        this.memories.push(memory);
    }

    async list(): Promise<MemoryEntity[]> {
        return [...this.memories];
    }

    async search(query: string, topK: number = 5): Promise<SearchResult[]> {
        const queryVector = await this.embeddingService.embed(query);

        const results: SearchResult[] = this.memories.map(memory => {
            const score = memory.vector 
                ? VectorSearch.cosineSimilarity(queryVector, memory.vector) 
                : 0;
            return { memory, score };
        });

        // Sort descending by score
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, topK);
    }
}
