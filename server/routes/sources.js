import { Hono } from 'hono';
import { query } from '../db.js';

const sourcesRoutes = new Hono();

sourcesRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  
  try {
    const body = await c.req.json();
    const { 
      platform, 
      sourceUrl, 
      title, 
      channel, 
      durationSec, 
      contentType, 
      primaryTopic, 
      detectedLanguage, 
      metadata 
    } = body;

    if (!platform || !sourceUrl) {
      return c.json({ error: 'platform and sourceUrl are required' }, 400);
    }

    const sql = `
      INSERT INTO sources (
        user_id, platform, source_url, title, channel, duration_sec, 
        content_type, primary_topic, detected_language, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      ON CONFLICT (user_id, source_url) DO UPDATE SET
        platform = EXCLUDED.platform,
        title = EXCLUDED.title,
        channel = EXCLUDED.channel,
        duration_sec = EXCLUDED.duration_sec,
        content_type = EXCLUDED.content_type,
        primary_topic = EXCLUDED.primary_topic,
        detected_language = COALESCE(EXCLUDED.detected_language, sources.detected_language),
        metadata = EXCLUDED.metadata
      RETURNING id
    `;

    const values = [
      userId,
      platform,
      sourceUrl,
      title || null,
      channel || null,
      durationSec || null,
      contentType || null,
      primaryTopic || null,
      detectedLanguage || 'en',
      metadata || {}
    ];

    const result = await query(sql, values);
    return c.json({ id: result.rows[0].id }, 201);
  } catch (err) {
    console.error('Sources route error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default sourcesRoutes;
