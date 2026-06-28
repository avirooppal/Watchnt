import { describe, it, expect } from 'vitest';
import type { Content, VideoContent } from '../../src/content.js';
import type { KnowledgeObject, SummaryObject } from '../../src/knowledge.js';
import { assertNever } from '../../src/content.js';
import { createContentId, createNoteId, createTimestamp } from '../../src/ids.js';

describe('Content and KnowledgeObject Types', () => {
  it('allows narrowing Content by type', () => {
    const video: Content = {
      id: createContentId('vid1'),
      type: 'video',
      createdAt: createTimestamp(100),
      durationMs: 5000,
      mimeType: 'video/mp4'
    };

    if (video.type === 'video') {
      expect(video.durationMs).toBe(5000);
      expect(video.mimeType).toBe('video/mp4');
    } else {
      assertNever(video);
    }
  });

  it('allows narrowing KnowledgeObject by objectType', () => {
    const summary: KnowledgeObject = {
      id: createNoteId('note1'),
      contentId: createContentId('vid1'),
      objectType: 'summary',
      createdAt: createTimestamp(100),
      text: 'This is a summary',
      bullets: ['Point 1', 'Point 2']
    };

    if (summary.objectType === 'summary') {
      expect(summary.text).toBe('This is a summary');
      expect(summary.bullets?.length).toBe(2);
    }
  });
});
