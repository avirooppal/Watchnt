import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessingCoordinator } from '../../src/coordinator.js';
import { TranscriptionStep } from '../../src/transcription.js';
import { EmbeddingStep } from '../../src/embedding.js';
import { SummarizationStep } from '../../src/summary.js';
import { EventBus } from '@watchnt/pipeline';
import { ModelFacade } from '@watchnt/models';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId, isSuccess } from '@watchnt/shared';

describe('ProcessingCoordinator', () => {
  let bus: EventBus;
  let models: ModelFacade;
  let coordinator: ProcessingCoordinator;

  beforeEach(async () => {
    bus = new EventBus();
    const db = new PGLiteRelationalStorage('memory://coord_test_' + Math.random());
    models = new ModelFacade(db);
    await models.migrate();
    coordinator = new ProcessingCoordinator(bus, models);
  });

  it('orchestrates pipeline execution and persists output', async () => {
    const unsub = coordinator.startListening();
    const contentId = createContentId('coord-vid');

    // Create root content first so foreign keys succeed
    await models.content.create({ id: contentId, type: 'video', createdAt: Date.now() as any } as any);

    // Register steps to bus
    const steps = [new TranscriptionStep(), new EmbeddingStep(), new SummarizationStep()];
    
    // Wire steps dynamically
    bus.subscribeAll(async (event) => {
      for (const step of steps) {
        if (step.handles.includes(event.type)) {
          await step.execute(event, bus);
        }
      }
    });

    // Start pipeline
    await bus.publish({
      type: 'audio.ready',
      payload: { contentId, mimeType: 'audio/webm' }
    });

    // Pipeline should execute: audio -> transcript -> summary & embeddings
    
    // Verify Job States were recorded
    const jobs = Array.from(coordinator.jobs.values());
    expect(jobs.length).toBeGreaterThanOrEqual(3); // Transcribe, Summary, Embed
    expect(jobs.every(j => j.status === 'completed')).toBe(true);
    expect(jobs.every(j => j.progress === 100)).toBe(true);

    // Verify Data Persistence
    const fragsRes = await models.knowledge.getFragmentsByContentId(contentId);
    expect(isSuccess(fragsRes)).toBe(true);
    if (isSuccess(fragsRes)) {
      const types = fragsRes.value.map(f => f.type);
      expect(types).toContain('transcript');
      expect(types).toContain('summary');
      expect(types).toContain('chunk');
    }

    // Verify Vectors
    // The embeddings step generates mock arrays of length 384 of random values
    // Let's just search for a generic vector to ensure table is populated
    const vecRes = await models.vectors.search(new Array(384).fill(0.5), 10);
    expect(isSuccess(vecRes)).toBe(true);
    if (isSuccess(vecRes)) {
      expect(vecRes.value.length).toBeGreaterThan(0);
      expect(vecRes.value[0].embedding.length).toBe(384);
    }

    unsub();
  });
});
