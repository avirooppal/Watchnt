import { Hono } from 'hono';
import { query, pool } from '../db.js';
import pgvector from 'pgvector';

const cardsRoutes = new Hono();

cardsRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { sourceId, cards } = await c.req.json();
    if (!sourceId || !Array.isArray(cards)) {
      return c.json({ error: 'sourceId and cards array are required' }, 400);
    }

    const client = await pool.connect();
    const cardIds = [];

    try {
      await client.query('BEGIN');

      for (const card of cards) {
        // 1. Insert card
        const cardRes = await client.query(
          `INSERT INTO cards (
            source_id, user_id, title, summary, insights, actions, concepts, source_start, source_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            sourceId, userId, card.title, card.summary, 
            JSON.stringify(card.insights || []), 
            JSON.stringify(card.actions || []), 
            JSON.stringify(card.concepts || []), 
            card.sourceStart || null, card.sourceEnd || null
          ]
        );
        const cardId = cardRes.rows[0].id;
        cardIds.push(cardId);

        // 2. Insert tags & card_tags
        if (card.tags && Array.isArray(card.tags)) {
          for (const tagName of card.tags) {
            const tagRes = await client.query(
              `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
              [tagName]
            );
            const tagId = tagRes.rows[0].id;
            await client.query(
              `INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [cardId, tagId]
            );
          }
        }

        // 3. Insert embedding
        if (card.embedding && Array.isArray(card.embedding)) {
          await client.query(
            `INSERT INTO card_embeddings (card_id, embedding) VALUES ($1, $2)`,
            [cardId, pgvector.toSql(card.embedding)]
          );
        }
      }

      await client.query('COMMIT');
      return c.json({ cardIds }, 201);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk insert cards error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

cardsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const page = parseInt(c.req.query('page') || '1', 10);
  let limit = parseInt(c.req.query('limit') || '20', 10);
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;

  const type = c.req.query('type');
  const tag = c.req.query('tag');
  const q = c.req.query('q');
  const lang = c.req.query('lang');

  const conditions = ['c.user_id = $1'];
  const values = [userId];
  let paramIndex = 2;

  let joins = `JOIN sources s ON s.id = c.source_id`;

  if (tag) {
    joins += `
      JOIN card_tags ct ON ct.card_id = c.id
      JOIN tags t ON t.id = ct.tag_id
    `;
    conditions.push(`t.name = $${paramIndex++}`);
    values.push(tag);
  }

  if (type) {
    conditions.push(`s.content_type = $${paramIndex++}`);
    values.push(type);
  }

  if (lang) {
    conditions.push(`s.detected_language = $${paramIndex++}`);
    values.push(lang);
  }

  if (q) {
    conditions.push(`c.search_vector @@ plainto_tsquery('english', $${paramIndex++})`);
    values.push(q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await query(`
      SELECT count(DISTINCT c.id) 
      FROM cards c 
      ${joins}
      ${whereClause}
    `, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const cardsRes = await query(`
      SELECT c.*, s.title AS source_title, s.channel, s.platform 
      FROM cards c
      ${joins}
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...values, limit, offset]);

    return c.json({ cards: cardsRes.rows, total }, 200);
  } catch (err) {
    console.error('List cards error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

cardsRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const cardRes = await query(`
      SELECT c.*, s.title AS source_title, s.channel, s.platform, s.source_url
      FROM cards c
      JOIN sources s ON s.id = c.source_id
      WHERE c.id = $1 AND c.user_id = $2
    `, [cardId, userId]);

    if (cardRes.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    const card = cardRes.rows[0];

    const tagsRes = await query(`
      SELECT t.name 
      FROM tags t
      JOIN card_tags ct ON ct.tag_id = t.id
      WHERE ct.card_id = $1
    `, [cardId]);

    card.tags = tagsRes.rows.map(row => row.name);

    return c.json(card, 200);
  } catch (err) {
    console.error('Get card error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

cardsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const delRes = await query(
      `DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id`, 
      [cardId, userId]
    );
    
    if (delRes.rows.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json({ deleted: true }, 200);
  } catch (err) {
    console.error('Delete card error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default cardsRoutes;
