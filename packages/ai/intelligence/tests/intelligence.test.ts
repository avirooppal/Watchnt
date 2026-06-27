import { describe, it, expect, vi } from 'vitest';
import { TranscriptBuilder } from '../src/TranscriptBuilder';
import { TranscriptSegment } from '@watchnt/transcription';
import { SpeakerTimeline } from '@watchnt/diarization';
import { MeetingAnalyzer } from '../src/MeetingAnalyzer';
import { PromptExecutor } from '@watchnt/prompts';
import { AIProvider } from '@watchnt/providers';

// The generateObject function in Vercel AI SDK must be mocked globally where it's used
// But since the MeetingAnalyzer tests just call PromptExecutor, we can mock the executor itself,
// or we can mock 'ai' in the test context if the executor is imported.

class MockPromptExecutor extends PromptExecutor {
    constructor() {
        super({} as any, 'mock');
    }
    
    async execute<T = string>(asset: any, inputs: any): Promise<T> {
        if (asset.id === 'core-summary') return { summary: "Mock summary." } as unknown as T;
        if (asset.id === 'core-actions') return { actions: ["Task A", "Task B"] } as unknown as T;
        if (asset.id === 'core-decisions') return { decisions: ["Decision 1"] } as unknown as T;
        return {} as T;
    }
}

describe('TranscriptBuilder Edge Cases', () => {
    it('should assign speaker based on majority overlap', () => {
        const segments: TranscriptSegment[] = [
            { id: '1', text: 'Spans multiple', startTime: 2, endTime: 6, confidence: 0.99 }
        ];

        // Speaker A speaks for 1s of the segment, Speaker B speaks for 3s of the segment
        const timeline: SpeakerTimeline = [
            { speakerId: 'Speaker A', startTime: 0, endTime: 3 },
            { speakerId: 'Speaker B', startTime: 3, endTime: 10 }
        ];

        const merged = TranscriptBuilder.merge(segments, timeline);
        expect(merged[0].speakerId).toBe('Speaker B'); // B has larger overlap (3s vs 1s)
    });

    it('should handle un-attributed gaps', () => {
        const segments: TranscriptSegment[] = [
            { id: '1', text: 'Silence around me', startTime: 10, endTime: 12, confidence: 0.99 }
        ];

        // No speaker timeline covers 10-12s
        const timeline: SpeakerTimeline = [
            { speakerId: 'Alice', startTime: 0, endTime: 5 }
        ];

        const merged = TranscriptBuilder.merge(segments, timeline);
        expect(merged[0].speakerId).toBe('Unknown Speaker');
    });

    it('should ignore micro-segment noise that barely overlaps', () => {
        const segments: TranscriptSegment[] = [
            { id: '1', text: 'Real speech', startTime: 1, endTime: 4, confidence: 0.99 }
        ];

        // Alice is the real speaker. A micro-segment of noise was detected for Bob that barely touches the start.
        const timeline: SpeakerTimeline = [
            { speakerId: 'Bob', startTime: 0.95, endTime: 1.05 }, // 0.05s overlap
            { speakerId: 'Alice', startTime: 1.05, endTime: 5.0 } // 2.95s overlap
        ];

        const merged = TranscriptBuilder.merge(segments, timeline);
        expect(merged[0].speakerId).toBe('Alice');
    });
});

describe('MeetingAnalyzer', () => {
    it('should extract summary, actions, and decisions', async () => {
        const executor = new MockPromptExecutor();
        const analyzer = new MeetingAnalyzer(executor);
        
        const segments = [{ id: '1', text: 'Let us do A.', startTime: 0, endTime: 1, confidence: 1, speakerId: 'Alice' }];
        
        const summary = await analyzer.generateSummary(segments);
        expect(summary).toBe('Mock summary.');

        const actions = await analyzer.extractActionItems(segments);
        expect(actions).toEqual(['Task A', 'Task B']);

        const decisions = await analyzer.extractDecisions(segments);
        expect(decisions).toEqual(['Decision 1']);
    });
});
