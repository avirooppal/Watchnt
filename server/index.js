import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { jwtMiddleware } from './auth.js';

import authRoutes from './routes/auth.js';
import sourcesRoutes from './routes/sources.js';
import cardsRoutes from './routes/cards.js';
import searchRoutes from './routes/search.js';
import transcribeRoutes from './routes/transcribe.js';
import llmRoutes from './routes/llm.js';
import embedRoutes from './routes/embed.js';
import exportRoutes from './routes/export.js';

const app = new Hono();

// 1. Health check (no auth required)
app.get('/health', (c) => c.json({ status: 'ok' }, 200));

// 2. Auth routes (no JWT required, they handle login/register logic)
app.route('/auth', authRoutes);

// 3. Apply JWT middleware globally to all subsequent routes
app.use('*', jwtMiddleware);

// 4. Protected routes
app.route('/sources', sourcesRoutes);
app.route('/cards', cardsRoutes);
app.route('/search', searchRoutes);
app.route('/transcribe', transcribeRoutes);
app.route('/llm', llmRoutes);
app.route('/embed', embedRoutes);
app.route('/export', exportRoutes);

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`Watchn't API listening on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
