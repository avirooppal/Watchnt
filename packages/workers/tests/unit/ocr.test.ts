import { describe, it, expect } from 'vitest';
import { OcrStep } from '../../src/ocr.js';
import { EventBus, type PipelineEvent } from '@watchnt/pipeline';
import { createContentId } from '@watchnt/shared';
import type { PdfContent, ScreenshotContent } from '@watchnt/shared';

describe('OcrStep – OCR task routing', () => {
  it('is a no-op for video content (non-OCR type)', async () => {
    const bus = new EventBus();
    const step = new OcrStep();
    const events: PipelineEvent[] = [];
    bus.subscribeAll((e) => events.push(e));

    await step.execute({
      type: 'content.created',
      payload: {
        content: {
          id: createContentId('vid-1'),
          type: 'video',
          createdAt: Date.now() as any
        } as any
      }
    }, bus);

    expect(events).toHaveLength(0);
  });

  it('routes pdf content through OCR and emits chunks.ready', async () => {
    const bus = new EventBus();
    const step = new OcrStep();
    const events: PipelineEvent[] = [];
    bus.subscribeAll((e) => events.push(e));

    const pdf: PdfContent = {
      id: createContentId('pdf-1'),
      type: 'pdf',
      createdAt: Date.now() as any,
      title: 'Annual Report',
      pageCount: 5
    };

    await step.execute({ type: 'content.created', payload: { content: pdf } }, bus);

    const types = events.map((e) => e.type);
    expect(types).toContain('job.started');
    expect(types).toContain('chunks.ready');
    expect(types).toContain('job.completed');

    const chunksEvent = events.find((e) => e.type === 'chunks.ready') as Extract<PipelineEvent, { type: 'chunks.ready' }>;
    expect(chunksEvent.payload.contentId).toBe(pdf.id);
    expect(chunksEvent.payload.chunks[0].text).toContain('Annual Report');
  });

  it('routes screenshot content through OCR', async () => {
    const bus = new EventBus();
    const step = new OcrStep();
    const events: PipelineEvent[] = [];
    bus.subscribeAll((e) => events.push(e));

    const screenshot: ScreenshotContent = {
      id: createContentId('ss-1'),
      type: 'screenshot',
      createdAt: Date.now() as any,
      title: 'Design Mockup'
    };

    await step.execute({ type: 'content.created', payload: { content: screenshot } }, bus);

    const types = events.map((e) => e.type);
    expect(types).toContain('chunks.ready');
  });
});

describe('OcrStep – content subtype compatibility', () => {
  it('handles article content type', async () => {
    const bus = new EventBus();
    const step = new OcrStep();
    const events: PipelineEvent[] = [];
    bus.subscribeAll((e) => events.push(e));

    await step.execute({
      type: 'content.created',
      payload: {
        content: {
          id: createContentId('article-1'),
          type: 'article',
          createdAt: Date.now() as any,
          title: 'Tech Blog Post',
          url: 'https://example.com/post'
        } as any
      }
    }, bus);

    const chunks = events.find((e) => e.type === 'chunks.ready') as Extract<PipelineEvent, { type: 'chunks.ready' }>;
    expect(chunks).toBeDefined();
    expect(chunks.payload.chunks[0].text).toContain('Tech Blog Post');
  });

  it('is a no-op for unrecognised non-OCR types', async () => {
    const bus = new EventBus();
    const step = new OcrStep();
    const events: PipelineEvent[] = [];
    bus.subscribeAll((e) => events.push(e));

    await step.execute({
      type: 'content.created',
      payload: {
        content: {
          id: createContentId('meeting-1'),
          type: 'meeting',
          createdAt: Date.now() as any
        } as any
      }
    }, bus);

    expect(events).toHaveLength(0);
  });
});
