export type CaptureStatus = 'queued' | 'recording' | 'processing' | 'embedding' | 'generating_notes' | 'completed' | 'error';

export type KnowledgeSourceType = 'youtube' | 'podcast' | 'meeting' | 'article' | 'pdf' | 'browser_audio' | 'voice_memo' | 'custom';

export interface CaptureSession {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  title: string;
  status: CaptureStatus;
  progress: number; // 0-100
  startedAt: number;
  endedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
  contentId?: string; // Links to the final Knowledge Object
}

export type AssetType = 'audio' | 'video' | 'transcript' | 'captions' | 'text' | 'screenshot' | 'speaker_segments';

export interface KnowledgeAsset {
  id: string;
  sessionId: string;
  type: AssetType;
  data: any; // Blob, string, or parsed JSON
  metadata?: Record<string, any>;
  createdAt: number;
}
