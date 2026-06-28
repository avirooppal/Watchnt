import { describe, it, expect } from 'vitest';
import { TranscriptionStep } from '../../src/transcription.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId } from '@watchnt/shared';

describe('TranscriptionStep', () => {
  it('handles audio.ready and produces transcript.ready', async () => {
    const bus = new EventBus();
    const step = new TranscriptionStep();
    const contentId = createContentId('vid-1');
    const events: PipelineEvent[] = [];

    bus.subscribeAll((event) => {
      events.push(event);
    });

    // Simulate receiving audio
    await step.execute({
      type: 'audio.ready',
      payload: { contentId, mimeType: 'audio/webm' }
    }, bus);

    // Should have published job events and transcript
    const types = events.map(e => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('job.progress');
    expect(types).toContain('transcript.ready');
    expect(types).toContain('job.completed');

    const transcriptEvent = events.find(e => e.type === 'transcript.ready') as Extract<PipelineEvent, { type: 'transcript.ready' }>;
    expect(transcriptEvent).toBeDefined();
    expect(transcriptEvent.payload.contentId).toBe(contentId);
    expect(transcriptEvent.payload.transcript.objectType).toBe('transcript');
    expect(transcriptEvent.payload.transcript.segments[0].text).toBe('This is a mock transcription');
  });
});
