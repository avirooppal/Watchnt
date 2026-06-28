import { describe, it, expect } from 'vitest';
import { EmbeddingStep } from '../../src/embedding.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId, createNoteId, createTimestamp } from '@watchnt/shared';

describe('EmbeddingStep', () => {
  it('handles transcript.ready and produces embeddings.ready', async () => {
    const bus = new EventBus();
    const step = new EmbeddingStep();
    const contentId = createContentId('vid-2');
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
        { startMs: 0, endMs: 2000, text: 'This is the first segment.' },
        { startMs: 2000, endMs: 4000, text: 'This is the second segment.' }
      ]
    };

    // Simulate receiving transcript
    await step.execute({
      type: 'transcript.ready',
      payload: { contentId, transcript: mockTranscript }
    }, bus);

    // Should have published job events and embeddings
    const types = events.map(e => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('embeddings.ready');
    expect(types).toContain('job.completed');

    const embeddingsEvent = events.find(e => e.type === 'embeddings.ready') as Extract<PipelineEvent, { type: 'embeddings.ready' }>;
    expect(embeddingsEvent).toBeDefined();
    expect(embeddingsEvent.payload.contentId).toBe(contentId);
    
    // We should have 2 chunks mapped from the 2 transcript segments
    const chunks = embeddingsEvent.payload.chunks;
    expect(chunks.length).toBe(2);
    expect(chunks[0].text).toBe('This is the first segment.');
    expect(chunks[0].embedding?.length).toBe(384);
  });
});
