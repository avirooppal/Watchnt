import type { EventBus, PipelineEvent } from '@watchnt/pipeline';
import type { ModelFacade } from '@watchnt/models';

export interface JobState {
  jobId: string;
  stepName: string;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  contentId?: string;
}

export class ProcessingCoordinator {
  public jobs: Map<string, JobState> = new Map();

  constructor(
    private bus: EventBus,
    private models: ModelFacade
  ) {}

  public startListening(): () => void {
    const unsubscribe = this.bus.subscribeAll(async (event: PipelineEvent) => {
      // 1. Handle telemetry (job.* events)
      if (event.type.startsWith('job.')) {
        this.handleJobEvent(event as Extract<PipelineEvent, { type: `job.${string}` }>);
      }
      
      // 2. Handle data persistence (writing outputs to db)
      await this.handleDataPersistence(event);
    });

    return unsubscribe;
  }

  private handleJobEvent(event: Extract<PipelineEvent, { type: `job.${string}` }>) {
    const { jobId, stepName } = event.payload;
    
    if (event.type === 'job.started') {
      const e = event as Extract<PipelineEvent, { type: 'job.started' }>;
      this.jobs.set(jobId, {
        jobId,
        stepName,
        progress: 0,
        status: 'running',
        contentId: e.payload.contentId
      });
    } else {
      const state = this.jobs.get(jobId);
      if (!state) return;

      if (event.type === 'job.progress') {
        const e = event as Extract<PipelineEvent, { type: 'job.progress' }>;
        state.progress = e.payload.progress;
      } else if (event.type === 'job.completed') {
        state.progress = 100;
        state.status = 'completed';
      } else if (event.type === 'job.failed') {
        const e = event as Extract<PipelineEvent, { type: 'job.failed' }>;
        state.status = 'failed';
        state.error = e.payload.error.message;
      } else if (event.type === 'job.cancelled') {
        state.status = 'cancelled';
      }
    }
  }

  private async handleDataPersistence(event: PipelineEvent): Promise<void> {
    if (event.type === 'transcript.ready') {
      const { transcript } = event.payload;
      await this.models.knowledge.addFragment({
        id: transcript.id,
        content_id: transcript.contentId,
        type: transcript.objectType,
        content: JSON.stringify(transcript.segments)
      });
    } else if (event.type === 'summary.ready') {
      const { summary } = event.payload;
      await this.models.knowledge.addFragment({
        id: summary.id,
        content_id: summary.contentId,
        type: summary.objectType,
        content: summary.text,
        metadata: JSON.stringify({ bullets: summary.bullets })
      });
    } else if (event.type === 'embeddings.ready') {
      const { chunks } = event.payload;
      for (const chunk of chunks) {
        // Save the chunk text
        await this.models.knowledge.addFragment({
          id: chunk.id,
          content_id: chunk.contentId,
          type: chunk.objectType,
          content: chunk.text,
          metadata: JSON.stringify({ startMs: chunk.startMs, endMs: chunk.endMs })
        });
        
        // Save the vector embedding
        if (chunk.embedding) {
          await this.models.vectors.addEmbedding({
            id: `vec-${chunk.id}`,
            content_id: chunk.contentId,
            fragment_id: chunk.id,
            embedding: chunk.embedding
          });
        }
      }
    }
  }
}
