import { Hono } from 'hono';
import { query } from '../db.js';
import pgvector from 'pgvector';

const searchRoutes = new Hono();

searchRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { embedding, limit = 20, threshold = 0.5 } = body;

    if (!embedding || !Array.isArray(embedding)) {
      return c.json({ error: 'embedding array is required' }, 400);
    }

    const sql = `
      SELECT c.*, s.title AS source_title, s.channel, s.platform, s.source_url,
             1 - (e.embedding <=> $1) AS score
      FROM cards c
      JOIN card_embeddings e ON e.card_id = c.id
      JOIN sources s ON s.id = c.source_id
      WHERE c.user_id = $2
        AND 1 - (e.embedding <=> $1) > $3
      ORDER BY score DESC
      LIMIT $4
    `;

    const values = [pgvector.toSql(embedding), userId, threshold, limit];
    
    const result = await query(sql, values);
    
    return c.json({ results: result.rows }, 200);
  } catch (err) {
    console.error('Search route error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default searchRoutes;
