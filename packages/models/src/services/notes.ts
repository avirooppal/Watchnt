import { type Result, success, failure } from '@watchnt/shared';
import type { ModelFacade } from '../facade.js';
import type { NoteId, ContentId } from '@watchnt/shared';

export class NotesService {
  constructor(private facade: ModelFacade) {}

  /**
   * Save a note and automatically extract and sync its backlinks.
   */
  async saveNote(id: NoteId, contentId: ContentId, text: string, isUpdate: boolean, timestampMs?: number): Promise<Result<void>> {
    try {
      // 1. Save or Update the note text
      if (isUpdate) {
        const updateRes = await this.facade.notes.update(id, text, timestampMs);
        if (!updateRes.ok) return updateRes;
      } else {
        const createRes = await this.facade.notes.create({
          id,
          content_id: contentId,
          text,
          timestamp_ms: timestampMs
        });
        if (!createRes.ok) return createRes;
      }

      // 2. Extract wikilinks from text [[Link Target]]
      const targets = this.extractWikilinks(text);

      // 3. Sync backlinks
      const syncRes = await this.facade.backlinks.syncBacklinks(id, targets, Date.now());
      if (!syncRes.ok) return syncRes;

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private extractWikilinks(text: string): string[] {
    const targets = new Set<string>();
    // Matches [[target]] or [[target|alias]]
    const regex = /\[\[(.*?)\]\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      let target = match[1].trim();
      if (target.includes('|')) {
        target = target.split('|')[0].trim();
      }
      if (target.length > 0) {
        targets.add(target);
      }
    }
    return Array.from(targets);
  }
}
