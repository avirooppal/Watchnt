import { describe, it, expect } from 'vitest';
import { DiarizationStep } from '../../src/diarization.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId, createNoteId, createTimestamp } from '@watchnt/shared';
import type { TranscriptObject } from '@watchnt/shared';

describe('DiarizationStep', () => {
  it('assigns Speaker 1 to all segments when there are no long pauses', async () => {
    const bus = new EventBus();
    const step = new DiarizationStep();
    const contentId = createContentId('vid-diarize-1');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => events.push(event));

    const transcript: TranscriptObject = {
      id: createNoteId('t1'),
      contentId,
      objectType: 'transcript',
      createdAt: createTimestamp(0),
      segments: [
        { startMs: 0,    endMs: 1000, text: 'Hello there.' },
        { startMs: 1100, endMs: 2000, text: 'How are you?' },
        { startMs: 2100, endMs: 3000, text: 'I am fine.' }
      ]
    };

    await step.execute({ type: 'transcript.ready', payload: { contentId, transcript } }, bus);

    const diarizationEvent = events.find(e => e.type === 'diarization.ready') as Extract<PipelineEvent, { type: 'diarization.ready' }>;
    expect(diarizationEvent).toBeDefined();

    const segments = diarizationEvent.payload.transcript.segments;
    // No pause > 1500ms, so all segments should be Speaker 1
    expect(segments[0].speakerId).toBe('Speaker 1');
    expect(segments[1].speakerId).toBe('Speaker 1');
    expect(segments[2].speakerId).toBe('Speaker 1');
  });

  it('detects speaker change on a pause > 1500ms', async () => {
    const bus = new EventBus();
    const step = new DiarizationStep();
    const contentId = createContentId('vid-diarize-2');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => events.push(event));

    const transcript: TranscriptObject = {
      id: createNoteId('t2'),
      contentId,
      objectType: 'transcript',
      createdAt: createTimestamp(0),
      segments: [
        { startMs: 0,    endMs: 2000, text: 'First speaker says this.' },
        // Gap of 2000ms — exceeds the 1500ms threshold
        { startMs: 4000, endMs: 5500, text: 'Second speaker responds.' },
        { startMs: 5600, endMs: 6500, text: 'Second speaker continues.' }
      ]
    };

    await step.execute({ type: 'transcript.ready', payload: { contentId, transcript } }, bus);

    const diarizationEvent = events.find(e => e.type === 'diarization.ready') as Extract<PipelineEvent, { type: 'diarization.ready' }>;
    expect(diarizationEvent).toBeDefined();

    const segments = diarizationEvent.payload.transcript.segments;
    expect(segments[0].speakerId).toBe('Speaker 1');
    expect(segments[1].speakerId).toBe('Speaker 2'); // Changed after large gap
    expect(segments[2].speakerId).toBe('Speaker 2'); // Continues same speaker (gap only 100ms)
  });

  it('publishes job.started and job.completed lifecycle events', async () => {
    const bus = new EventBus();
    const step = new DiarizationStep();
    const contentId = createContentId('vid-diarize-3');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => events.push(event));

    const transcript: TranscriptObject = {
      id: createNoteId('t3'),
      contentId,
      objectType: 'transcript',
      createdAt: createTimestamp(0),
      segments: [{ startMs: 0, endMs: 1000, text: 'Solo segment.' }]
    };

    await step.execute({ type: 'transcript.ready', payload: { contentId, transcript } }, bus);

    const types = events.map(e => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('diarization.ready');
    expect(types).toContain('job.completed');
  });

  it('is a no-op for non-transcript.ready events', async () => {
    const bus = new EventBus();
    const step = new DiarizationStep();
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => events.push(event));

    await step.execute({ type: 'audio.ready', payload: { contentId: 'c1' as any, mimeType: 'audio/webm' } }, bus);

    expect(events.length).toBe(0);
  });
});
