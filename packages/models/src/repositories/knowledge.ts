import { success, failure, type Result, type ContentId, type KnowledgeId } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface KnowledgeFragmentRecord {
  id: KnowledgeId;
  content_id: ContentId;
  created_at: number;
  type: string;
  content: string;
  metadata?: string | null;
}

export class KnowledgeRepository {
  constructor(private db: RelationalStorage) {}

  async addFragment(fragment: Omit<KnowledgeFragmentRecord, 'created_at'>): Promise<Result<void>> {
    const now = Date.now();
    const query = `
      INSERT INTO knowledge_fragments (id, content_id, created_at, type, content, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const params = [
      fragment.id,
      fragment.content_id,
      now,
      fragment.type,
      fragment.content,
      fragment.metadata || null
    ];

    return this.db.execute(query, params);
  }

  async getFragmentsByContentId(contentId: ContentId): Promise<Result<KnowledgeFragmentRecord[]>> {
    const query = `SELECT * FROM knowledge_fragments WHERE content_id = $1 ORDER BY created_at ASC`;
    return this.db.query<KnowledgeFragmentRecord>(query, [contentId]);
  }

  async getFragmentsByType(contentId: ContentId, type: string): Promise<Result<KnowledgeFragmentRecord[]>> {
    const query = `SELECT * FROM knowledge_fragments WHERE content_id = $1 AND type = $2 ORDER BY created_at ASC`;
    return this.db.query<KnowledgeFragmentRecord>(query, [contentId, type]);
  }

  async deleteFragment(id: KnowledgeId): Promise<Result<void>> {
    const query = `DELETE FROM knowledge_fragments WHERE id = $1`;
    return this.db.execute(query, [id]);
  }

  async deleteByContentId(contentId: ContentId): Promise<Result<void>> {
    const query = `DELETE FROM knowledge_fragments WHERE content_id = $1`;
    return this.db.execute(query, [contentId]);
  }
}
