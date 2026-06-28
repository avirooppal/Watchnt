import { type Result, success, failure } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';
import { SearchService, type SearchResultItem } from './search.js';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type RetrievalStrategy = 'hybrid' | 'vector-only' | 'fts-only';

export interface RagContext {
  query: string;
  strategy: RetrievalStrategy;
  results: SearchResultItem[];
  /** Serialised context block ready to be injected into a prompt */
  contextBlock: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// ContextBuilder
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds a RAG (Retrieval-Augmented Generation) context block for a given
 * user query.  The context block is a plain-text snippet listing the most
 * relevant fragments, ready to be interpolated into a prompt template.
 *
 * Strategy selection:
 *   - 'hybrid'      — RRF over vector + FTS (default, best quality)
 *   - 'vector-only' — cosine similarity only (no FTS)
 *   - 'fts-only'    — full-text search only (no embeddings required)
 */
export class ContextBuilder {
  private searchService: SearchService;

  constructor(private db: RelationalStorage) {
    this.searchService = new SearchService(db);
  }

  async build(
    query: string,
    queryVector: number[],
    strategy: RetrievalStrategy = 'hybrid',
    limit = 5
  ): Promise<Result<RagContext>> {
    try {
      let results: SearchResultItem[];

      if (strategy === 'hybrid') {
        const res = await this.searchService.searchHybrid(query, queryVector, limit);
        if (!res.ok) return failure(res.error);
        results = res.value;
      } else if (strategy === 'vector-only') {
        const res = await this.searchService.searchSimilar(queryVector, limit);
        if (!res.ok) return failure(res.error);
        results = res.value;
      } else {
        // fts-only — use a zero vector so the vector CTE returns nothing useful;
        // the FTS branch will dominate in the hybrid query
        const zeroVec = new Array(384).fill(0);
        const res = await this.searchService.searchHybrid(query, zeroVec, limit);
        if (!res.ok) return failure(res.error);
        results = res.value;
      }

      const contextBlock = this._buildContextBlock(query, results);

      return success({ query, strategy, results, contextBlock });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private _buildContextBlock(query: string, results: SearchResultItem[]): string {
    if (results.length === 0) {
      return `No relevant context found for: "${query}"`;
    }

    const lines = results.map((r, i) =>
      `[${i + 1}] (${r.content_title ?? r.content_id}) — ${r.fragment_text.slice(0, 300)}`
    );

    return `Relevant context for query: "${query}"\n\n${lines.join('\n\n')}`;
  }
}
