import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage, type RelationalStorage } from '@watchnt/storage';

describe('GraphRepository', () => {
  let db: RelationalStorage;
  let facade: ModelFacade;

  beforeEach(async () => {
    db = new PGLiteRelationalStorage('memory://graph_test_' + Math.random());
    facade = new ModelFacade(db);
    const migrateRes = await facade.migrate();
    if (!migrateRes.ok) throw migrateRes.error;
  });

  afterEach(async () => {
  });

  it('can create and retrieve entities and edges', async () => {
    // Insert content first due to foreign key
    await facade.content.create({
      id: 'cont-1',
      type: 'video',
      createdAt: 100
    });

    const entityRes = await facade.graph.addEntity({
      id: 'ent-1',
      type: 'person',
      name: 'Alice',
      content_id: 'cont-1',
      created_at: 100
    });
    expect(entityRes.ok).toBe(true);

    const entity2Res = await facade.graph.addEntity({
      id: 'ent-2',
      type: 'technology',
      name: 'Svelte',
      content_id: 'cont-1',
      created_at: 100
    });
    expect(entity2Res.ok).toBe(true);

    const edgeRes = await facade.graph.addEdge({
      id: 'edge-1',
      source_id: 'ent-1',
      target_id: 'ent-2',
      relationship: 'uses',
      created_at: 100
    });
    expect(edgeRes.ok).toBe(true);

    const entities = await facade.graph.getEntitiesForContent('cont-1');
    expect(entities.ok).toBe(true);
    if (entities.ok) {
      expect(entities.value).toHaveLength(2);
      expect(entities.value[0].name).toBe('Alice');
    }

    const related = await facade.graph.getRelatedEntities('ent-1');
    expect(related.ok).toBe(true);
    if (related.ok) {
      expect(related.value).toHaveLength(1);
      expect(related.value[0].entity.name).toBe('Svelte');
      expect(related.value[0].relationship).toBe('uses');
    }

    const allEntities = await facade.graph.getAllEntities();
    expect(allEntities.ok).toBe(true);
    if (allEntities.ok) {
      expect(allEntities.value).toHaveLength(2);
    }

    const allEdges = await facade.graph.getAllEdges();
    expect(allEdges.ok).toBe(true);
    if (allEdges.ok) {
      expect(allEdges.value).toHaveLength(1);
    }
  });
});
