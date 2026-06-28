import { describe, it, expect, beforeEach } from 'vitest';
import { ModelFacade } from '../../src/facade.js';
import { NotesService } from '../../src/services/notes.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { createContentId } from '@watchnt/shared';

describe('NotesService', () => {
  let storage: PGLiteRelationalStorage;
  let facade: ModelFacade;
  let service: NotesService;

  beforeEach(async () => {
    storage = new PGLiteRelationalStorage('memory://notes_srv_test_' + Math.random());
    facade = new ModelFacade(storage);
    await facade.migrate();
    service = new NotesService(facade);
  });

  it('saves note and extracts wikilinks', async () => {
    const cId = createContentId('test-vid');
    await facade.content.create({ id: cId as any, type: 'video', createdAt: 100 } as any);

    const nId = 'note-with-links' as any;
    const text = 'Here is a [[Direct Link]] and an [[Aliased Link|Alias]]. Also some normal text.';

    const saveRes = await service.saveNote(nId, cId, text, false);
    expect(saveRes.ok).toBe(true);

    const fwdRes = await facade.backlinks.getForwardLinks(nId);
    expect(fwdRes.ok).toBe(true);
    if (fwdRes.ok) {
      expect(fwdRes.value).toHaveLength(2);
      const targets = fwdRes.value.map(r => r.target_note_name);
      expect(targets).toContain('Direct Link');
      expect(targets).toContain('Aliased Link');
    }

    // Now update the note and remove one link
    const newText = 'Only the [[Direct Link]] is left.';
    const updateRes = await service.saveNote(nId, cId, newText, true);
    expect(updateRes.ok).toBe(true);

    const fwdRes2 = await facade.backlinks.getForwardLinks(nId);
    if (fwdRes2.ok) {
      expect(fwdRes2.value).toHaveLength(1);
      expect(fwdRes2.value[0].target_note_name).toBe('Direct Link');
    }
  });
});
