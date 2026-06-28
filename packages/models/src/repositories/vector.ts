import { success, failure, type Result, type ContentId, type KnowledgeId } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface EmbeddingRecord {
  id: string;
  content_id: ContentId;
  fragment_id?: KnowledgeId | null;
  embedding: number[];
}

export interface SimilarityResult extends EmbeddingRecord {
  similarity: number; // usually 1 - cosine distance
}

export class VectorRepository {
  constructor(private db: RelationalStorage) {}

  async addEmbedding(record: EmbeddingRecord): Promise<Result<void>> {
    const query = `
      INSERT INTO embeddings (id, content_id, fragment_id, embedding)
      VALUES ($1, $2, $3, $4)
    `;
    
    const params = [
      record.id,
      record.content_id,
      record.fragment_id || null,
      JSON.stringify(record.embedding) // pgvector takes a string representation like '[1,2,3]'
    ];

    return this.db.execute(query, params);
  }

  async search(queryVector: number[], limit: number = 5): Promise<Result<SimilarityResult[]>> {
    // We use cosine distance operator '<=>'
    // 1 - (embedding <=> queryVector) gives cosine similarity
    const query = `
      SELECT id, content_id, fragment_id, embedding, (1 - (embedding <=> $1)) as similarity
      FROM embeddings
      ORDER BY embedding <=> $1 ASC
      LIMIT $2
    `;

    const res = await this.db.query<any>(query, [JSON.stringify(queryVector), limit]);
    if (!res.ok) return failure(res.error);

    // Map string embedding back to number[]
    const mapped = res.value.map(row => ({
      ...row,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding
    }));
    
    return success(mapped);
  }

  async deleteByContentId(contentId: ContentId): Promise<Result<void>> {
    const query = `DELETE FROM embeddings WHERE content_id = $1`;
    return this.db.execute(query, [contentId]);
  }
}
