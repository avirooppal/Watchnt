import { describe, it, expect } from 'vitest';
import { TranscriptBuilder } from '../src/TranscriptBuilder';
import { SpeakerTimeline } from '../src/SpeakerTimeline';
import { TranscriptSegment } from '@watchnt/transcription';

describe('TranscriptBuilder', () => {
    it('should correctly attribute segments to speakers based on overlap', () => {
        const segments: TranscriptSegment[] = [
            { id: 's1', text: 'Hello', startTime: 0, endTime: 2.0, confidence: 0.99 },
            { id: 's2', text: 'world', startTime: 2.5, endTime: 4.0, confidence: 0.99 },
            { id: 's3', text: 'How are you?', startTime: 4.5, endTime: 6.0, confidence: 0.99 },
            { id: 's4', text: 'Good!', startTime: 6.5, endTime: 8.0, confidence: 0.99 }
        ];

        const timeline: SpeakerTimeline = [
            { speakerId: 'Speaker A', startTime: 0, endTime: 4.2 },
            { speakerId: 'Speaker B', startTime: 4.5, endTime: 8.5 }
        ];

        const attributed = TranscriptBuilder.build(segments, timeline);

        expect(attributed.length).toBe(2);
        
        expect(attributed[0].speakerId).toBe('Speaker A');
        expect(attributed[0].text).toBe('Hello world');
        
        expect(attributed[1].speakerId).toBe('Speaker B');
        expect(attributed[1].text).toBe('How are you? Good!');
    });
});
