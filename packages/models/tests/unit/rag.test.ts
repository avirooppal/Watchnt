import { describe, it, expect, beforeEach } from 'vitest';
import { ContextBuilder } from '../../src/services/rag.js';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId, createNoteId, isSuccess } from '@watchnt/shared';

describe('ContextBuilder', () => {
  let db: PGLiteRelationalStorage;
  let facade: ModelFacade;
  let builder: ContextBuilder;

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://rag-test-' + Math.random());
    facade = new ModelFacade(db);
    await facade.migrate();
    builder = new ContextBuilder(db);
  });

  async function seedContent(suffix: string, text: string) {
    const contentId = createContentId('c-' + suffix);
    await facade.content.create({ id: contentId, type: 'video', createdAt: Date.now() as any, title: 'Video ' + suffix } as any);
    const fragId = createNoteId('f-' + suffix);
    await facade.knowledge.addFragment({ id: fragId, content_id: contentId, type: 'chunk', content: text });
    const vec = new Array(384).fill(0.1);
    vec[0] = parseFloat('0.' + suffix);
    await facade.vectors.addEmbedding({ id: 'v-' + suffix, content_id: contentId, fragment_id: fragId, embedding: vec });
    return { contentId, fragId, vec };
  }

  it('returns a hybrid context block with results', async () => {
    const { vec } = await seedContent('1', 'Machine learning and neural networks are fascinating.');
    const res = await builder.build('neural networks', vec, 'hybrid', 5);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.strategy).toBe('hybrid');
      expect(res.value.results.length).toBeGreaterThan(0);
      expect(res.value.contextBlock).toContain('neural networks');
    }
  });

  it('returns a vector-only context block', async () => {
    const { vec } = await seedContent('2', 'Database indexing and query optimisation.');
    const res = await builder.build('indexing', vec, 'vector-only', 5);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.strategy).toBe('vector-only');
      expect(res.value.results.length).toBeGreaterThan(0);
    }
  });

  it('falls back gracefully when no results match', async () => {
    const zeroVec = new Array(384).fill(0);
    const res = await builder.build('completely irrelevant query xyz', zeroVec, 'hybrid', 5);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.contextBlock).toContain('No relevant context');
    }
  });

  it('selects fts-only strategy', async () => {
    await seedContent('3', 'Transformer architecture in large language models.');
    const zeroVec = new Array(384).fill(0);
    const res = await builder.build('transformer architecture', zeroVec, 'fts-only', 5);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.strategy).toBe('fts-only');
    }
  });
});
