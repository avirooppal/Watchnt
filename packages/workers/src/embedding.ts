import type { PipelineStep, ExecutionContext, PipelineEvent, EventBus } from '@watchnt/pipeline';
import { createNoteId, createTimestamp } from '@watchnt/shared';

export class EmbeddingStep implements PipelineStep {
  name = 'EmbeddingStep';
  context: ExecutionContext = 'worker';
  handles: PipelineEvent['type'][] = ['transcript.ready'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'transcript.ready') return;
    const { contentId, transcript } = event.payload;

    await bus.publish({
      type: 'job.started',
      payload: { jobId: 'embed-' + contentId, stepName: this.name, contentId }
    });

    // Simulate work: in a real implementation we would:
    // 1. Chunk the transcript into meaning boundaries
    // 2. Feed chunks to Transformers.js to get 384-d vectors
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock chunks and embeddings
    const mockChunks = transcript.segments.map((segment, index) => {
      // Mock embedding generation (384-dimensional vector)
      const embedding = new Array(384).fill(0).map(() => Math.random());
      
      return {
        id: createNoteId(`chunk-${index}`),
        contentId,
        objectType: 'chunk' as const,
        createdAt: createTimestamp(0),
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        embedding
      };
    });

    await bus.publish({
      type: 'embeddings.ready',
      payload: { contentId, chunks: mockChunks }
    });

    await bus.publish({
      type: 'job.completed',
      payload: { jobId: 'embed-' + contentId, stepName: this.name, result: mockChunks.length }
    });
  }
}
