import { Hono } from 'hono';

const embedRoutes = new Hono();

embedRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  if (!process.env.OLLAMA_HOST) {
    return c.json({ error: 'Embeddings unavailable' }, 501);
  }

  try {
    const body = await c.req.json();
    const { text } = body;

    if (!text) {
      return c.json({ error: 'text is required' }, 400);
    }

    const response = await fetch(`${process.env.OLLAMA_HOST}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status: ${response.status}`);
    }

    const result = await response.json();
    const embedding = result.embedding; 

    return c.json({ embedding }, 200);

  } catch (err) {
    console.error('Embed route error:', err);
    return c.json({ error: 'Ollama unreachable' }, 503);
  }
});

export default embedRoutes;
