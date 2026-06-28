import { success, failure, type Result, type ContentId, type Content, type Timestamp } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

// Base content record as stored in the DB
export interface ContentRecord {
  id: string;
  type: string;
  created_at: number;
  updated_at: number;
  title?: string | null;
  mime_type?: string | null;
  duration_ms?: number | null;
  file_size?: number | null;
}

export class ContentRepository {
  constructor(private db: RelationalStorage) {}

  async create(content: Partial<Content> & { id: ContentId, type: string, createdAt: Timestamp }): Promise<Result<void>> {
    const now = Date.now();
    const query = `
      INSERT INTO content (id, type, created_at, updated_at, title, mime_type, duration_ms, file_size)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    // Using any for the specific fields depending on type
    const typedContent = content as any;
    const params = [
      content.id,
      content.type,
      content.createdAt,
      now, // updated_at
      typedContent.title || null,
      typedContent.mimeType || null,
      typedContent.durationMs || null,
      typedContent.fileSize || null
    ];

    return this.db.execute(query, params);
  }

  async get(id: ContentId): Promise<Result<ContentRecord | null>> {
    const query = `SELECT * FROM content WHERE id = $1 LIMIT 1`;
    const res = await this.db.query<ContentRecord>(query, [id]);
    
    if (!res.ok) return failure(res.error);
    
    if (res.value.length === 0) {
      return success(null);
    }
    return success(res.value[0]);
  }

  async update(id: ContentId, updates: Partial<ContentRecord>): Promise<Result<void>> {
    const now = Date.now();
    
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      fields.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    fields.push(`updated_at = $${paramIndex}`);
    params.push(now);
    paramIndex++;

    params.push(id);

    const query = `UPDATE content SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    
    return this.db.execute(query, params);
  }

  async delete(id: ContentId): Promise<Result<void>> {
    const query = `DELETE FROM content WHERE id = $1`;
    return this.db.execute(query, [id]);
  }

  async listByType(type: string): Promise<Result<ContentRecord[]>> {
    const query = `SELECT * FROM content WHERE type = $1 ORDER BY created_at DESC`;
    return this.db.query<ContentRecord>(query, [type]);
  }
}
