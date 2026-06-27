import { describe, it, expect, vi } from 'vitest';
import { TransformersWhisperService } from '../src/TransformersWhisperService';

// Mock the transformers package to prevent it from actually downloading models
vi.mock('@huggingface/transformers', () => {
    const mockTranscriber = vi.fn().mockResolvedValue({
        text: " mocked text",
        chunks: [
            { text: "mocked", timestamp: [0, 1.5] },
            { text: "text", timestamp: [1.5, 2.5] }
        ]
    });

    return {
        pipeline: vi.fn().mockResolvedValue(mockTranscriber),
        env: {
            allowLocalModels: false,
            useBrowserCache: true
        }
    };
});

describe('TransformersWhisperService', () => {
    it('should transcribe an audio buffer into segments', async () => {
        const service = new TransformersWhisperService();
        const buffer = new ArrayBuffer(8);
        const segments = await service.transcribe(buffer);
        
        expect(segments.length).toBe(2);
        expect(segments[0].text).toContain('mocked');
        expect(segments[0].startTime).toBe(0);
        expect(segments[0].endTime).toBe(1.5);
    });
});
