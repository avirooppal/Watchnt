/**
 * OCR task routing types.
 * These are the types used to communicate between the OCR step and the pipeline.
 * The actual OCR runs through the AI provider abstraction.
 */

export type OcrSourceType = 'pdf' | 'screenshot' | 'article';

export interface OcrTask {
  contentId: string;
  sourceType: OcrSourceType;
  /** Raw image/PDF data as a base64 string or ArrayBuffer reference */
  dataRef: string;
  /** Optional: page or frame index for multi-page documents */
  pageIndex?: number;
}

export interface OcrResult {
  contentId: string;
  text: string;
  confidence?: number;
  pageIndex?: number;
}
