import { describe, it, expect, beforeEach } from 'vitest';
import { ModelFacade } from '../../src/facade.js';
import { PGLiteRelationalStorage } from '@watchnt/storage';
import { isSuccess } from '@watchnt/shared';

describe('FlashcardRepository', () => {
  let storage: PGLiteRelationalStorage;
  let facade: ModelFacade;

  beforeEach(async () => {
    storage = new PGLiteRelationalStorage('memory://flashcards_test_' + Math.random());
    facade = new ModelFacade(storage);
    const migrateRes = await facade.migrate();
    expect(migrateRes.ok).toBe(true);
  });

  it('can manage templates and flashcards', async () => {
    // 1. Check default template exists
    const tpls = await facade.flashcards.getTemplates();
    expect(tpls.ok).toBe(true);
    if (tpls.ok) {
      expect(tpls.value.length).toBeGreaterThan(0);
      expect(tpls.value[0].id).toBe('tpl-basic-qa');
    }

    // Create a base content to satisfy foreign key
    await facade.content.create({ id: 'c-flash' as any, type: 'video', createdAt: Date.now() } as any);

    // 2. Create Flashcard
    const cardId = 'fc-1';
    const now = Date.now();
    const createRes = await facade.flashcards.createFlashcard({
      id: cardId,
      content_id: 'c-flash',
      template_id: 'tpl-basic-qa',
      front_data: JSON.stringify({ question: 'What is Svelte?' }),
      back_data: JSON.stringify({ answer: 'A UI framework.' }),
      next_review_at: now - 1000, // Due immediately
    });
    expect(createRes.ok).toBe(true);

    // 3. Retrieve by Content ID
    const byContent = await facade.flashcards.getFlashcardsByContentId('c-flash');
    expect(byContent.ok).toBe(true);
    if (byContent.ok) {
      expect(byContent.value).toHaveLength(1);
    }

    // 4. Get Due Flashcards
    const dueRes = await facade.flashcards.getDueFlashcards(10);
    expect(dueRes.ok).toBe(true);
    if (dueRes.ok) {
      expect(dueRes.value).toHaveLength(1);
      expect(dueRes.value[0].id).toBe(cardId);
    }

    // 5. Update next review
    const updateRes = await facade.flashcards.updateNextReview(cardId, now + 100000);
    expect(updateRes.ok).toBe(true);

    // Verify it is no longer due
    const dueRes2 = await facade.flashcards.getDueFlashcards(10);
    if (dueRes2.ok) {
      expect(dueRes2.value).toHaveLength(0);
    }
  });
});
