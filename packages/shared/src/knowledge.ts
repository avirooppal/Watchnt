import type { ContentId, NoteId, TimestampMs } from './ids.js';

export interface BaseKnowledgeObject {
  id: NoteId;
  contentId: ContentId;
  objectType: string;
  createdAt: TimestampMs;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  speakerId?: string;
}

export interface TranscriptObject extends BaseKnowledgeObject {
  objectType: 'transcript';
  segments: TranscriptSegment[];
}

export interface ChunkObject extends BaseKnowledgeObject {
  objectType: 'chunk';
  text: string;
  startMs?: number;
  endMs?: number;
  embedding?: number[];
}

export interface SummaryObject extends BaseKnowledgeObject {
  objectType: 'summary';
  text: string;
  bullets?: string[];
}

export interface InsightObject extends BaseKnowledgeObject {
  objectType: 'insight';
  text: string;
  importanceScore?: number;
}

export interface QuoteObject extends BaseKnowledgeObject {
  objectType: 'quote';
  text: string;
  speakerId?: string;
}

export interface ActionItemObject extends BaseKnowledgeObject {
  objectType: 'action-item';
  description: string;
  assignee?: string;
  status: 'pending' | 'completed';
}

export interface FlashcardCandidateObject extends BaseKnowledgeObject {
  objectType: 'flashcard-candidate';
  front: string;
  back: string;
}

export interface EntityObject extends BaseKnowledgeObject {
  objectType: 'entity';
  name: string;
  entityType: string;
  description?: string;
}

export interface GraphEdgeObject extends BaseKnowledgeObject {
  objectType: 'graph-edge';
  sourceId: NoteId | ContentId;
  targetId: NoteId | ContentId;
  relationshipType: string;
}

export type KnowledgeObject =
  | TranscriptObject
  | ChunkObject
  | SummaryObject
  | InsightObject
  | QuoteObject
  | ActionItemObject
  | FlashcardCandidateObject
  | EntityObject
  | GraphEdgeObject;
