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
}
