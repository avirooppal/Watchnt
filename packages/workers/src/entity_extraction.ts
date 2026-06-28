import type { PipelineStep, PipelineEvent, EventBus } from '@watchnt/pipeline';
import { createNoteId, createTimestamp } from '@watchnt/shared';

export class EntityExtractionStep implements PipelineStep {
  name = 'EntityExtractionStep';
  context: 'worker' = 'worker';
  handles: PipelineEvent['type'][] = ['summary.ready'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'summary.ready') return;
    const { contentId, summary } = event.payload;

    await bus.publish({
      type: 'job.started',
      payload: { jobId: 'mock-entity-job', stepName: this.name, contentId }
    });

    // Simulate LLM parsing overhead
    await new Promise(resolve => setTimeout(resolve, 800));

    // Hardcode mock entities for this pipeline run
    const svelteEntityId = createNoteId('ent-svelte-' + Date.now());
    const localFirstEntityId = createNoteId('ent-localfirst-' + Date.now());

    const mockEntities = [
      {
        id: svelteEntityId,
        contentId,
        objectType: 'entity' as const,
        createdAt: createTimestamp(0),
        name: 'Svelte',
        entityType: 'technology',
        description: 'A frontend framework for building cybernetic web apps.'
      },
      {
        id: localFirstEntityId,
        contentId,
        objectType: 'entity' as const,
        createdAt: createTimestamp(0),
        name: 'Local-first Architecture',
        entityType: 'concept',
        description: 'Software that works offline by default using local databases.'
      }
    ];

    const mockEdges = [
      {
        id: createNoteId('edge-1-' + Date.now()),
        contentId,
        objectType: 'graph-edge' as const,
        createdAt: createTimestamp(0),
        sourceId: svelteEntityId,
        targetId: localFirstEntityId,
        relationshipType: 'uses'
      }
    ];

    await bus.publish({
      type: 'graph.updated',
      payload: { contentId, newEntities: mockEntities, newEdges: mockEdges }
    });

    await bus.publish({
      type: 'job.completed',
      payload: { jobId: 'mock-entity-job', stepName: this.name }
    });
  }
}
