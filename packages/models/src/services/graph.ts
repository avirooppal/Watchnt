import { type Result, success, failure } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface GraphEdge {
  source_id: string;
  target_id: string;
  type: string;
  depth: number;
}

export class GraphService {
  constructor(private db: RelationalStorage) {}

  /**
   * Performs a breadth-first search to find all connected content nodes up to a certain depth.
   * Uses a recursive CTE to traverse the content_relationships table.
   * 
   * @param nodeId The origin content ID
   * @param maxDepth The maximum traversal depth (hard capped at 3 to avoid blowout)
   */
  async getConnections(nodeId: string, maxDepth: number = 2): Promise<Result<GraphEdge[]>> {
    const depthLimit = Math.min(Math.max(1, maxDepth), 3);
    
    const query = `
      WITH RECURSIVE traverse(source_id, target_id, type, depth) AS (
        SELECT source_id, target_id, type, 1 as depth
        FROM content_relationships
        WHERE source_id = $1 OR target_id = $1
      
        UNION
      
        SELECT cr.source_id, cr.target_id, cr.type, t.depth + 1
        FROM content_relationships cr
        JOIN traverse t 
          ON (cr.source_id = t.target_id 
           OR cr.target_id = t.source_id 
           OR cr.source_id = t.source_id 
           OR cr.target_id = t.target_id)
        WHERE t.depth < $2
      )
      SELECT source_id, target_id, type, MIN(depth) as depth
      FROM traverse
      GROUP BY source_id, target_id, type
      ORDER BY depth ASC;
    `;

    try {
      const res = await this.db.query<GraphEdge>(query, [nodeId, depthLimit]);
      if (!res.ok) return failure(res.error);
      return success(res.value);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
