import { describe, it, expect } from 'vitest';
import { FlashcardExtractionStep } from '../../src/flashcard_extraction.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId, createNoteId, createTimestamp } from '@watchnt/shared';

describe('FlashcardExtractionStep', () => {
  it('handles summary.ready and produces flashcards.ready', async () => {
    const bus = new EventBus();
    const step = new FlashcardExtractionStep();
    const contentId = createContentId('vid-fc-test');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => {
      events.push(event);
    });

    const summaryEvent: PipelineEvent = {
      type: 'summary.ready',
      payload: {
        contentId,
        summary: {
          id: createNoteId('sum1'),
          contentId,
          objectType: 'summary',
          createdAt: createTimestamp(0),
          text: 'Mock summary text'
        }
      }
    };

    await step.execute(summaryEvent, bus);

    const types = events.map(e => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('job.progress');
    expect(types).toContain('flashcards.ready');
    expect(types).toContain('job.completed');

    const fcEvent = events.find(e => e.type === 'flashcards.ready') as Extract<PipelineEvent, { type: 'flashcards.ready' }>;
    expect(fcEvent).toBeDefined();
    expect(fcEvent.payload.contentId).toBe(contentId);
    expect(fcEvent.payload.flashcards.length).toBeGreaterThan(0);
    expect(fcEvent.payload.flashcards[0].question).toContain(contentId);
  });
});
