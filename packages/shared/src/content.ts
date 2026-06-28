import type { ContentId, TimestampMs, ContentHash } from './ids.js';

export interface BaseContent {
  id: ContentId;
  type: string;
  sourceUri?: string;
  createdAt: TimestampMs;
  hash?: ContentHash;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoContent extends BaseContent {
  type: 'video';
  mimeType?: string;
  durationMs?: number;
}

export interface AudioContent extends BaseContent {
  type: 'audio';
  mimeType?: string;
  durationMs?: number;
}

export interface MeetingContent extends BaseContent {
  type: 'meeting';
  participants?: string[];
  durationMs?: number;
}

export interface PodcastContent extends BaseContent {
  type: 'podcast';
  showName?: string;
  episodeName?: string;
}

export interface VoiceMemoContent extends BaseContent {
  type: 'voice-memo';
  durationMs?: number;
}

export interface ConversationContent extends BaseContent {
  type: 'conversation';
  participants?: string[];
}

export interface PdfContent extends BaseContent {
  type: 'pdf';
  pageCount?: number;
}

export interface ArticleContent extends BaseContent {
  type: 'article';
  url?: string;
  author?: string;
}

export interface ScreenshotContent extends BaseContent {
  type: 'screenshot';
  dimensions?: { width: number; height: number };
}

export type Content =
  | VideoContent
  | AudioContent
  | MeetingContent
  | PodcastContent
  | VoiceMemoContent
  | ConversationContent
  | PdfContent
  | ArticleContent
  | ScreenshotContent;

// Exhaustiveness check helper
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
