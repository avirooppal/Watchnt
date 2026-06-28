import { describe, it, expect, beforeEach } from 'vitest';
import { GraphService } from '../../src/services/graph.js';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId, isSuccess } from '@watchnt/shared';

describe('GraphService', () => {
  let db: PGLiteRelationalStorage;
  let facade: ModelFacade;
  let graphService: GraphService;

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://graph_test_' + Math.random());
    facade = new ModelFacade(db);
    await facade.migrate();
    graphService = new GraphService(db);
  });

  it('traverses the relationship graph correctly to the given depth', async () => {
    const c1 = createContentId('c1');
    const c2 = createContentId('c2');
    const c3 = createContentId('c3');
    const c4 = createContentId('c4');

    // Create contents
    for (const id of [c1, c2, c3, c4]) {
      await facade.content.create({
        id, type: 'video', createdAt: Date.now() as any
      } as any);
    }

    // Insert edges: c1 -> c2, c2 -> c3, c3 -> c4
    await db.query('INSERT INTO content_relationships (source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4)', [c1, c2, 'references', Date.now()]);
    await db.query('INSERT INTO content_relationships (source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4)', [c2, c3, 'references', Date.now()]);
    await db.query('INSERT INTO content_relationships (source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4)', [c3, c4, 'references', Date.now()]);

    // Depth 1 from c1 should just return (c1->c2)
    const resDepth1 = await graphService.getConnections(c1, 1);
    expect(isSuccess(resDepth1)).toBe(true);
    if (isSuccess(resDepth1)) {
      expect(resDepth1.value.length).toBe(1);
      expect(resDepth1.value[0].source_id).toBe(c1);
      expect(resDepth1.value[0].target_id).toBe(c2);
      expect(resDepth1.value[0].depth).toBe(1);
    }

    // Depth 2 from c1 should return (c1->c2) and (c2->c3)
    const resDepth2 = await graphService.getConnections(c1, 2);
    expect(isSuccess(resDepth2)).toBe(true);
    if (isSuccess(resDepth2)) {
      expect(resDepth2.value.length).toBe(2);
      
      const edge23 = resDepth2.value.find(e => e.source_id === c2 && e.target_id === c3);
      expect(edge23).toBeDefined();
      expect(edge23?.depth).toBe(2);
    }

    // Depth 3 from c1 should return all 3 edges
    const resDepth3 = await graphService.getConnections(c1, 3);
    expect(isSuccess(resDepth3)).toBe(true);
    if (isSuccess(resDepth3)) {
      expect(resDepth3.value.length).toBe(3);
    }
  });
});
