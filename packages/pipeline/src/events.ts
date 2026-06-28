import type { 
  ContentId, 
  JobId,
  Content,
  TranscriptObject,
  ChunkObject,
  SummaryObject,
  GraphEdgeObject,
  EntityObject
} from '@watchnt/shared';

// Canonical domain events
export interface ContentCreatedEvent {
  type: 'content.created';
  payload: { content: Content };
}

export interface AudioReadyEvent {
  type: 'audio.ready';
  payload: { contentId: ContentId; buffer?: ArrayBuffer; mimeType: string };
}

export interface TranscriptReadyEvent {
  type: 'transcript.ready';
  payload: { contentId: ContentId; transcript: TranscriptObject };
}

export interface ChunksReadyEvent {
  type: 'chunks.ready';
  payload: { contentId: ContentId; chunks: ChunkObject[] };
}

export interface EmbeddingsReadyEvent {
  type: 'embeddings.ready';
  payload: { contentId: ContentId; chunks: ChunkObject[] };
}

export interface SummaryReadyEvent {
  type: 'summary.ready';
  payload: { contentId: ContentId; summary: SummaryObject };
}

export interface GraphUpdatedEvent {
  type: 'graph.updated';
  payload: { contentId: ContentId; newEdges: GraphEdgeObject[]; newEntities: EntityObject[] };
}

export interface ExportFinishedEvent {
  type: 'export.finished';
  payload: { contentId: ContentId; exportUrl?: string };
}

// Lifecycle events
export interface JobStartedEvent {
  type: 'job.started';
  payload: { jobId: JobId; stepName: string; contentId?: ContentId };
}

export interface JobProgressEvent {
  type: 'job.progress';
  payload: { jobId: JobId; stepName: string; progress: number };
}

export interface JobCompletedEvent {
  type: 'job.completed';
  payload: { jobId: JobId; stepName: string; result?: unknown };
}

export interface JobFailedEvent {
  type: 'job.failed';
  payload: { jobId: JobId; stepName: string; error: Error };
}

export interface JobCancelledEvent {
  type: 'job.cancelled';
  payload: { jobId: JobId; stepName: string };
}

export type PipelineEvent =
  | ContentCreatedEvent
  | AudioReadyEvent
  | TranscriptReadyEvent
  | ChunksReadyEvent
  | EmbeddingsReadyEvent
  | SummaryReadyEvent
  | GraphUpdatedEvent
  | ExportFinishedEvent
  | JobStartedEvent
  | JobProgressEvent
  | JobCompletedEvent
  | JobFailedEvent
  | JobCancelledEvent;

// Event handler type
export type PipelineEventHandler<T extends PipelineEvent> = (event: T) => void | Promise<void>;

// Exhaustive helper for type checking
export function assertExhaustiveEvent(x: never): never {
  throw new Error(`Unhandled event type: ${JSON.stringify(x)}`);
}
