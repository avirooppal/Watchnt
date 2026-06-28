import { success, failure, type Result } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface EntityRecord {
  id: string;
  type: string;
  name: string;
  content_id: string;
  created_at: number;
}

export interface GraphEdgeRecord {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  created_at: number;
}

export class GraphRepository {
  constructor(private db: RelationalStorage) {}

  async addEntity(entity: EntityRecord): Promise<Result<void>> {
    const query = `
      INSERT INTO entities (id, type, name, content_id, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const params = [entity.id, entity.type, entity.name, entity.content_id, entity.created_at];
    return this.db.execute(query, params);
  }

  async addEdge(edge: GraphEdgeRecord): Promise<Result<void>> {
    const query = `
      INSERT INTO graph_edges (id, source_id, target_id, relationship, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const params = [edge.id, edge.source_id, edge.target_id, edge.relationship, edge.created_at];
    return this.db.execute(query, params);
  }

  async getEntitiesForContent(contentId: string): Promise<Result<EntityRecord[]>> {
    const query = `SELECT * FROM entities WHERE content_id = $1`;
    return this.db.query<EntityRecord>(query, [contentId]);
  }

  async getRelatedEntities(entityId: string): Promise<Result<{ entity: EntityRecord, relationship: string }[]>> {
    const query = `
      SELECT e.*, g.relationship
      FROM graph_edges g
      JOIN entities e ON (g.source_id = e.id OR g.target_id = e.id)
      WHERE (g.source_id = $1 OR g.target_id = $1) AND e.id != $1
    `;
    const res = await this.db.query<EntityRecord & { relationship: string }>(query, [entityId]);
    if (!res.ok) return failure(res.error);
    
    const mapped = res.value.map(row => {
      const { relationship, ...entity } = row;
      return { entity: entity as EntityRecord, relationship };
    });
    return success(mapped);
  }

  async getAllEntities(): Promise<Result<EntityRecord[]>> {
    const query = `SELECT * FROM entities`;
    return this.db.query<EntityRecord>(query);
  }

  async getAllEdges(): Promise<Result<GraphEdgeRecord[]>> {
    const query = `SELECT * FROM graph_edges`;
    return this.db.query<GraphEdgeRecord>(query);
  }
}
