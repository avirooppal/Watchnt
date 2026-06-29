export interface KnowledgeSource {
  id: string;
  type: 'video' | 'audio' | 'meeting' | 'podcast' | 'article' | 'pdf' | 'other';
  origin: string;
  title?: string;
  author?: string;
  url: string;
  duration?: number;
  timestamps?: Array<{ start: number; end: number; text: string }>;
  transcript?: string;
  captions?: string;
  metadata?: Record<string, any>;
  mediaReference?: string;
  language?: string;
  confidence?: number;
  extractionMethod: 'native_transcript' | 'native_captions' | 'subtitle_track' | 'page_metadata' | 'media_stream' | 'tab_audio' | 'local_stt';
}

export interface KnowledgeSourceProvider {
  /**
   * Detects if this provider can handle the current page/context.
   */
  detect(url: string, dom?: Document): boolean | Promise<boolean>;

  /**
   * Returns a numerical priority for this provider. Higher is better.
   */
  getPriority(): number;

  /**
   * Extracts the content and returns a normalized KnowledgeSource object.
   */
  extract(url: string, dom?: Document): Promise<KnowledgeSource>;
}
