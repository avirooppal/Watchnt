import { Hono } from 'hono';
import { query } from '../db.js';

const exportRoutes = new Hono();

exportRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const format = c.req.query('format') || 'json';
  const sourceId = c.req.query('sourceId');

  try {
    let sql = `
      SELECT 
        c.*, 
        s.title AS source_title, 
        s.channel, 
        s.platform, 
        s.source_url, 
        s.detected_language,
        COALESCE(
          (SELECT json_agg(t.name) 
           FROM tags t 
           JOIN card_tags ct ON ct.tag_id = t.id 
           WHERE ct.card_id = c.id), '[]'::json
        ) as tags
      FROM cards c
      JOIN sources s ON s.id = c.source_id
      WHERE c.user_id = $1
    `;
    const values = [userId];

    if (sourceId) {
      sql += ` AND c.source_id = $2`;
      values.push(sourceId);
    }
    
    sql += ` ORDER BY c.created_at DESC`;

    const result = await query(sql, values);
    const cards = result.rows;

    if (format === 'markdown') {
      const markdownBlocks = cards.map(card => {
        const insightsList = (card.insights || []).map(i => `- ${i.text || i}`).join('\n');
        const actionsList = (card.actions || []).map(a => `- [ ] ${a.text || a}`).join('\n');
        const tagsList = (card.tags || []).map(t => `#${t}`).join(' ');
        
        const jumpLink = card.source_start != null 
          ? `[Jump to source: ${card.source_url}?t=${card.source_start}]` 
          : `[Jump to source: ${card.source_url}]`;

        return `# ${card.title}
**Source:** ${card.source_title || 'Unknown'} — ${card.channel || 'Unknown'}
**Platform:** ${card.platform}  **Language:** ${card.detected_language || 'en'}
**Tags:** ${tagsList}
**Captured:** ${new Date(card.created_at).toISOString()}

## Summary
${card.summary || ''}

## Key Insights
${insightsList}

## Actions
${actionsList}

${jumpLink}
---`;
      });

      const markdownContent = markdownBlocks.join('\n\n');
      
      c.header('Content-Disposition', 'attachment; filename="watchnt-export.md"');
      c.header('Content-Type', 'text/markdown; charset=utf-8');
      return c.body(markdownContent);
    } else {
      c.header('Content-Disposition', 'attachment; filename="watchnt-export.json"');
      c.header('Content-Type', 'application/json; charset=utf-8');
      return c.body(JSON.stringify(cards)); // Hono c.json doesn't allow setting arbitrary headers easily without overwriting, so using c.body with JSON.stringify is safer to preserve Content-Disposition
    }
  } catch (err) {
    console.error('Export route error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default exportRoutes;
