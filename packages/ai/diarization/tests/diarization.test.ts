
import { describe, it, expect } from 'vitest';
import { MockDiarizationService } from '../src/DiarizationService';

describe('DiarizationService', () => {
    it('should diarize an audio buffer into a timeline', async () => {
        const service = new MockDiarizationService();
        const buffer = new ArrayBuffer(8);
        const timeline = await service.diarize(buffer);
        
        expect(timeline.length).toBe(2);
        expect(timeline[0].speakerId).toBe('Speaker A');
        expect(timeline[1].speakerId).toBe('Speaker B');
    });
});
