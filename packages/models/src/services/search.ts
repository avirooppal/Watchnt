import { type Result, success, failure } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface SearchResultItem {
  similarity: number;
  fragment_id: string;
  fragment_text: string;
  content_id: string;
  content_title: string | null;
}

export class SearchService {
  constructor(private db: RelationalStorage) {}

  async searchSimilar(queryVector: number[], limit: number = 5): Promise<Result<SearchResultItem[]>> {
    const query = `
      SELECT 
        (1 - (e.embedding <=> $1)) as similarity,
        k.id as fragment_id,
        k.content as fragment_text,
        c.id as content_id,
        c.title as content_title
      FROM embeddings e
      JOIN knowledge_fragments k ON e.fragment_id = k.id
      JOIN content c ON e.content_id = c.id
      ORDER BY e.embedding <=> $1 ASC
      LIMIT $2
    `;

    try {
      const res = await this.db.query<SearchResultItem>(query, [JSON.stringify(queryVector), limit]);
      if (!res.ok) return failure(res.error);
      return success(res.value);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
  async searchHybrid(queryText: string, queryVector: number[], limit: number = 5): Promise<Result<SearchResultItem[]>> {
    // RRF combines the rank of Vector Search and FTS
    // Score = 1 / (k + rank)
    // We use k = 60 as standard
    const query = `
      WITH vector_results AS (
        SELECT 
          e.fragment_id,
          (1 - (e.embedding <=> $1)) as similarity,
          ROW_NUMBER() OVER (ORDER BY e.embedding <=> $1 ASC) as r_rank
        FROM embeddings e
        ORDER BY e.embedding <=> $1 ASC
        LIMIT 100
      ),
      fts_results AS (
        SELECT 
          k.id as fragment_id,
          ts_rank_cd(k.fts_vector, plainto_tsquery('english', $2)) as rank_score,
          ROW_NUMBER() OVER (ORDER BY ts_rank_cd(k.fts_vector, plainto_tsquery('english', $2)) DESC) as f_rank
        FROM knowledge_fragments k
        WHERE k.fts_vector @@ plainto_tsquery('english', $2)
        ORDER BY rank_score DESC
        LIMIT 100
      ),
      combined AS (
        SELECT 
          COALESCE(v.fragment_id, f.fragment_id) as fragment_id,
          v.similarity as similarity,
          COALESCE(1.0 / (60 + v.r_rank), 0) + COALESCE(1.0 / (60 + f.f_rank), 0) as rrf_score
        FROM vector_results v
        FULL OUTER JOIN fts_results f ON v.fragment_id = f.fragment_id
      )
      SELECT 
        -- Final score = rrf_score * recency_multiplier
        c.rrf_score * (1.0 + EXP(-GREATEST(0, $4::bigint - cnt.created_at) / 2592000000.0)) as similarity,
        k.id as fragment_id,
        k.content as fragment_text,
        cnt.id as content_id,
        cnt.title as content_title
      FROM combined c
      JOIN knowledge_fragments k ON c.fragment_id = k.id
      JOIN content cnt ON k.content_id = cnt.id
      ORDER BY similarity DESC
      LIMIT $3
    `;

    try {
      const nowMs = Date.now();
      const res = await this.db.query<any>(query, [JSON.stringify(queryVector), queryText, limit, nowMs]);
      if (!res.ok) return failure(res.error);
      
      const mapped = res.value.map((row: any) => ({
        ...row,
        similarity: parseFloat(row.similarity)
      })) as SearchResultItem[];
      
      return success(mapped);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
