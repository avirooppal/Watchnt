import { success, failure, type Result } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface BacklinkRecord {
  id: string;
  source_note_id: string;
  target_note_name: string;
  created_at: number;
}

export class BacklinkRepository {
  constructor(private db: RelationalStorage) {}

  /**
   * Syncs all backlinks for a given note. 
   * Deletes old backlinks for this note and inserts the new ones.
   */
  async syncBacklinks(sourceNoteId: string, targetNames: string[], createdAt: number): Promise<Result<void>> {
    // A real implementation might use a transaction here, but for PGLite simplicity 
    // we'll just execute them sequentially or delete first then insert.
    
    const delQuery = `DELETE FROM backlinks WHERE source_note_id = $1`;
    const delRes = await this.db.execute(delQuery, [sourceNoteId]);
    if (!delRes.ok) return failure(delRes.error);

    if (targetNames.length === 0) return success(undefined);

    // Insert new links
    for (const [index, targetName] of targetNames.entries()) {
      const id = `${sourceNoteId}-link-${index}-${Date.now()}`;
      const insQuery = `
        INSERT INTO backlinks (id, source_note_id, target_note_name, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      const insRes = await this.db.execute(insQuery, [id, sourceNoteId, targetName, createdAt]);
      if (!insRes.ok) return failure(insRes.error);
    }

    return success(undefined);
  }

  /**
   * Get all notes that link TO this target note name
   */
  async getBacklinks(targetNoteName: string): Promise<Result<BacklinkRecord[]>> {
    const query = `
      SELECT * FROM backlinks 
      WHERE LOWER(target_note_name) = LOWER($1)
      ORDER BY created_at DESC
    `;
    return this.db.query<BacklinkRecord>(query, [targetNoteName]);
  }

  /**
   * Get all links OUT from this note
   */
  async getForwardLinks(sourceNoteId: string): Promise<Result<BacklinkRecord[]>> {
    const query = `
      SELECT * FROM backlinks 
      WHERE source_note_id = $1
      ORDER BY created_at ASC
    `;
    return this.db.query<BacklinkRecord>(query, [sourceNoteId]);
  }
}
