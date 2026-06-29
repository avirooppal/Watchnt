import type { PipelineStep, ExecutionContext } from '../step.js';
import type { PipelineBus } from '../bus.js';
import type { AIProvider } from '@watchnt/ai';
import { ModelFacade } from '@watchnt/models';
import type { ContentId, EntityObject, GraphEdgeObject, PipelineEvent } from '@watchnt/shared';

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
}

export class GraphLinkerStep implements PipelineStep {
  name = 'graph-linker';
  context: ExecutionContext = 'main';
  handles: PipelineEvent['type'][] = ['summary.ready'];

  constructor(private ai: AIProvider, private models: ModelFacade) {}

  private async emitStarted(bus: PipelineBus, contentId: ContentId) {
    await bus.publish({ type: 'job.started', payload: { jobId: 'job_graph' as any, stepName: this.name, contentId } });
  }

  private async emitProgress(bus: PipelineBus, contentId: ContentId, progress: number) {
    await bus.publish({ type: 'job.progress', payload: { jobId: 'job_graph' as any, stepName: this.name, progress } });
  }

  private async emitCompleted(bus: PipelineBus, contentId: ContentId, result?: any) {
    await bus.publish({ type: 'job.completed', payload: { jobId: 'job_graph' as any, stepName: this.name, result } });
  }

  private async emitFailed(bus: PipelineBus, contentId: ContentId, error: Error) {
    await bus.publish({ type: 'job.failed', payload: { jobId: 'job_graph' as any, stepName: this.name, error } });
  }

  async execute(event: PipelineEvent, bus: PipelineBus): Promise<void> {
    if (event.type !== 'summary.ready') return;
    const { contentId } = event.payload;

    await this.emitStarted(bus, contentId);

    try {
      // 1. Get the transcript and summary
      const content = await this.models.content.get(contentId);
      if (!content.success) throw new Error('Content not found');
      
      const summaryResult = await this.models.knowledge.getFragmentsByContent(contentId);
      if (!summaryResult.success) throw new Error('Summary not found');
      
      const summaryFragment = summaryResult.data.find(f => f.type === 'summary');
      if (!summaryFragment) throw new Error('Summary fragment missing');

      await this.emitProgress(bus, contentId, 25);

      // 2. Extract entities and relationships using AI
      const prompt = `Extract the key entities (people, concepts, technologies, places) and the relationships between them from the following text.
      Return JSON in this format: { "entities": [{ "name": "RAG", "type": "Concept" }], "relationships": [{ "source": "RAG", "target": "Vector DB", "type": "uses" }] }
      
      Text:
      ${summaryFragment.content}`;

      const aiResponse = await this.ai.generateText({ prompt, model: 'fast' });
      
      let parsed;
      try {
        parsed = JSON.parse(aiResponse.text);
      } catch (e) {
        // Fallback or skip if not JSON
        await this.emitProgress(bus, contentId, 100);
        await this.emitCompleted(bus, contentId, { skipped: true, reason: 'Invalid AI JSON' });
        return;
      }

      const { entities = [], relationships = [] } = parsed;

      await this.emitProgress(bus, contentId, 75);

      // 3. Save to database
      const entityObjects: EntityObject[] = [];
      for (const e of entities) {
        const entity: EntityObject = {
          id: generateId('ent'),
          type: e.type,
          name: e.name,
          contentId,
          createdAt: Date.now()
        };
        entityObjects.push(entity);
        await this.models.graph.createEntity(entity);
      }

      const edgeObjects: GraphEdgeObject[] = [];
      for (const r of relationships) {
        const sourceEntity = entityObjects.find(e => e.name === r.source);
        const targetEntity = entityObjects.find(e => e.name === r.target);
        if (sourceEntity && targetEntity) {
          const edge: GraphEdgeObject = {
            id: generateId('edg'),
            sourceId: sourceEntity.id,
            targetId: targetEntity.id,
            relationship: r.type,
            createdAt: Date.now()
          };
          edgeObjects.push(edge);
          await this.models.graph.createEdge(edge);
        }
      }

      // 4. Emit graph.updated event
      await bus.publish({
        type: 'graph.updated',
        payload: {
          contentId,
          newEntities: entityObjects,
          newEdges: edgeObjects
        }
      });

      await this.emitCompleted(bus, contentId, { entities: entityObjects.length, edges: edgeObjects.length });
    } catch (error: any) {
      await this.emitFailed(bus, contentId, error);
      throw error;
    }
  }
}
