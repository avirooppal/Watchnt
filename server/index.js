import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { jwtMiddleware } from './auth.js';
import { query } from './db.js';

import sourcesRoutes from './routes/sources.js';
import cardsRoutes from './routes/cards.js';
import searchRoutes from './routes/search.js';
import transcribeRoutes from './routes/transcribe.js';
import llmRoutes from './routes/llm.js';
import embedRoutes from './routes/embed.js';
import exportRoutes from './routes/export.js';
import youtubeRoutes from './routes/youtube.js';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }, 200));

app.use('*', jwtMiddleware);

app.route('/sources', sourcesRoutes);
app.route('/cards', cardsRoutes);
app.route('/search', searchRoutes);
app.route('/transcribe', transcribeRoutes);
app.route('/llm', llmRoutes);
app.route('/embed', embedRoutes);
app.route('/export', exportRoutes);
app.route('/youtube', youtubeRoutes);

async function initDb() {
  try {
    await query(
      "INSERT INTO users (id, email, password_hash) VALUES ('00000000-0000-0000-0000-000000000001', 'local@watchnt.com', 'none') ON CONFLICT (id) DO NOTHING"
    );
    console.log('Database initialized with default local user.');
  } catch (err) {
    console.error('Failed to initialize local user:', err.message);
  }
}

const port = parseInt(process.env.PORT || '3001', 10);

initDb().then(() => {
  console.log(`Watchn't API listening on port ${port}`);
  serve({
    fetch: app.fetch,
    port
  });
});
