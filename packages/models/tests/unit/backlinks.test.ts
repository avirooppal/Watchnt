import { describe, it, expect, beforeEach } from 'vitest';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';

describe('BacklinkRepository', () => {
  let storage: PGLiteRelationalStorage;
  let facade: ModelFacade;

  beforeEach(async () => {
    storage = new PGLiteRelationalStorage('memory://backlinks_test_' + Math.random());
    facade = new ModelFacade(storage);
    const migrateRes = await facade.migrate();
    expect(migrateRes.ok).toBe(true);
  });

  it('can add and query backlinks', async () => {
    // We need a content and note to satisfy foreign keys
    const contentRes = await facade.content.create({
      id: 'c-1' as any, type: 'video', createdAt: 100
    } as any);
    expect(contentRes.ok).toBe(true);

    const noteRes = await facade.notes.create({
      id: 'n-1' as any, content_id: 'c-1', text: 'Hello [[World]]'
    });
    expect(noteRes.ok).toBe(true);
    
    // Add backlinks
    const syncRes = await facade.backlinks.syncBacklinks('n-1', ['World', 'Another Link'], Date.now());
    if (!syncRes.ok) console.error(syncRes.error);
    expect(syncRes.ok).toBe(true);
    
    // Query by target name
    const worldLinks = await facade.backlinks.getBacklinks('World');
    expect(worldLinks.ok).toBe(true);
    if (worldLinks.ok) {
      expect(worldLinks.value).toHaveLength(1);
      expect(worldLinks.value[0].source_note_id).toBe('n-1');
      expect(worldLinks.value[0].target_note_name).toBe('World');
    }

    // Forward links
    const fwdLinks = await facade.backlinks.getForwardLinks('n-1');
    expect(fwdLinks.ok).toBe(true);
    if (fwdLinks.ok) {
      expect(fwdLinks.value).toHaveLength(2);
    }
  });

  it('can sync (delete and recreate) backlinks for a note', async () => {
    await facade.content.create({ id: 'c-2' as any, type: 'video', createdAt: 100 } as any);
    await facade.notes.create({ id: 'n-2' as any, content_id: 'c-2', text: '' });
    
    // First sync
    await facade.backlinks.syncBacklinks('n-2', ['A', 'B'], Date.now());
    let links = await facade.backlinks.getForwardLinks('n-2');
    expect(links.ok && links.value.length).toBe(2);

    // Second sync (should replace A and B with C)
    await facade.backlinks.syncBacklinks('n-2', ['C'], Date.now());
    links = await facade.backlinks.getForwardLinks('n-2');
    expect(links.ok && links.value.length).toBe(1);
    if (links.ok) {
      expect(links.value[0].target_note_name).toBe('C');
    }
  });
});
