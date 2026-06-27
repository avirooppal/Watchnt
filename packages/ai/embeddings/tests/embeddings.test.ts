import { describe, it, expect, vi } from 'vitest';
import { TransformersEmbeddingService } from '../src/EmbeddingService';

vi.mock('@huggingface/transformers', () => {
    return {
        pipeline: vi.fn().mockResolvedValue(async (text: string) => {
            return {
                data: new Float32Array([0.1, 0.2, 0.3])
            };
        }),
        env: {
            allowLocalModels: true,
            backends: { onnx: { wasm: { numThreads: 1 } } }
        }
    };
});

describe('TransformersEmbeddingService', () => {
    it('should generate an embedding vector via transformers', async () => {
        // By mocking the pipeline, it won't actually download the model
        const service = new TransformersEmbeddingService();
        const vector = await service.embed('Hello world');
        
        expect(vector.length).toBe(3);
        expect(vector[0]).toBeCloseTo(0.1);
        expect(vector[1]).toBeCloseTo(0.2);
        expect(vector[2]).toBeCloseTo(0.3);
    });
});
