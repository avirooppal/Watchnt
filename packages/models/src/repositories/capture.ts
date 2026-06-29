import type { RelationalStorage } from '@watchnt/storage';
import type { CaptureSession, KnowledgeAsset, Result } from '@watchnt/shared';

export class CaptureRepository {
  constructor(private db: RelationalStorage) {}

  async createSession(session: CaptureSession): Promise<Result<void>> {
    try {
      await this.db.execute(
        `INSERT INTO capture_sessions (id, source_type, source_url, title, status, progress, started_at, metadata, content_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          session.id,
          session.sourceType,
          session.sourceUrl || null,
          session.title,
          session.status,
          session.progress,
          session.startedAt,
          session.metadata ? JSON.stringify(session.metadata) : null,
          session.contentId || null
        ]
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async updateSessionStatus(id: string, status: CaptureSession['status'], progress: number, error?: string): Promise<Result<void>> {
    try {
      await this.db.execute(
        `UPDATE capture_sessions SET status = $1, progress = $2, error = $3, ended_at = $4 WHERE id = $5`,
        [status, progress, error || null, status === 'completed' || status === 'error' ? Date.now() : null, id]
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getSession(id: string): Promise<Result<CaptureSession>> {
    try {
      const result = await this.db.query('SELECT * FROM capture_sessions WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return { success: false, error: 'Session not found' };
      }
      
      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          sourceType: row.source_type as any,
          sourceUrl: row.source_url,
          title: row.title,
          status: row.status as any,
          progress: row.progress,
          startedAt: Number(row.started_at),
          endedAt: row.ended_at ? Number(row.ended_at) : undefined,
          error: row.error,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          contentId: row.content_id
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async addAsset(asset: KnowledgeAsset): Promise<Result<void>> {
    try {
      let dataStr = typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data);
      await this.db.execute(
        `INSERT INTO knowledge_assets (id, session_id, type, data, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          asset.id,
          asset.sessionId,
          asset.type,
          dataStr,
          asset.metadata ? JSON.stringify(asset.metadata) : null,
          asset.createdAt
        ]
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
