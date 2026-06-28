import { success, failure, type Result, type ContentId, type NoteId } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface NoteRecord {
  id: NoteId;
  content_id: ContentId;
  created_at: number;
  updated_at: number;
  text: string;
  timestamp_ms?: number | null;
}

export class NoteRepository {
  constructor(private db: RelationalStorage) {}

  async create(note: Omit<NoteRecord, 'created_at' | 'updated_at'>): Promise<Result<void>> {
    const now = Date.now();
    const query = `
      INSERT INTO notes (id, content_id, created_at, updated_at, text, timestamp_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const params = [
      note.id,
      note.content_id,
      now,
      now,
      note.text,
      note.timestamp_ms || null
    ];

    return this.db.execute(query, params);
  }

  async getByContentId(contentId: ContentId): Promise<Result<NoteRecord[]>> {
    const query = `SELECT * FROM notes WHERE content_id = $1 ORDER BY created_at DESC`;
    return this.db.query<NoteRecord>(query, [contentId]);
  }

  async update(id: NoteId, text: string, timestampMs?: number): Promise<Result<void>> {
    const now = Date.now();
    
    if (timestampMs !== undefined) {
      const query = `UPDATE notes SET text = $1, timestamp_ms = $2, updated_at = $3 WHERE id = $4`;
      return this.db.execute(query, [text, timestampMs, now, id]);
    } else {
      const query = `UPDATE notes SET text = $1, updated_at = $2 WHERE id = $3`;
      return this.db.execute(query, [text, now, id]);
    }
  }

  async delete(id: NoteId): Promise<Result<void>> {
    const query = `DELETE FROM notes WHERE id = $1`;
    return this.db.execute(query, [id]);
  }
}
