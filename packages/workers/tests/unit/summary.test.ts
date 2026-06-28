import { describe, it, expect } from 'vitest';
import { SummarizationStep } from '../../src/summary.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId, createNoteId, createTimestamp } from '@watchnt/shared';

describe('SummarizationStep', () => {
  it('handles transcript.ready and produces summary.ready', async () => {
    const bus = new EventBus();
    const step = new SummarizationStep();
    const contentId = createContentId('vid-3');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => {
      events.push(event);
    });

    const mockTranscript = {
      id: createNoteId('t1'),
      contentId,
      objectType: 'transcript' as const,
      createdAt: createTimestamp(0),
      segments: [
        { startMs: 0, endMs: 2000, text: 'Hello world.' },
        { startMs: 2000, endMs: 4000, text: 'This is a test.' }
      ]
    };

    // Simulate receiving transcript
    await step.execute({
      type: 'transcript.ready',
      payload: { contentId, transcript: mockTranscript }
    }, bus);

    // Should have published job events and summary
    const types = events.map(e => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('summary.ready');
    expect(types).toContain('job.completed');

    const summaryEvent = events.find(e => e.type === 'summary.ready') as Extract<PipelineEvent, { type: 'summary.ready' }>;
    expect(summaryEvent).toBeDefined();
    expect(summaryEvent.payload.contentId).toBe(contentId);
    
    const summary = summaryEvent.payload.summary;
    expect(summary.objectType).toBe('summary');
    expect(summary.text).toContain('28 characters');
    expect(summary.bullets?.length).toBe(2);
  });
});
