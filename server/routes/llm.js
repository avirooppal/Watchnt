import { Hono } from 'hono';

const llmRoutes = new Hono();

llmRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  if (!process.env.OLLAMA_HOST) {
    return c.json({ error: 'LLM proxy unavailable' }, 501);
  }

  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1';

  try {
    const body = await c.req.json();
    const { system, user } = body;

    if (!system || !user) {
      return c.json({ error: 'system and user are required' }, 400);
    }

    const response = await fetch(`${process.env.OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status: ${response.status}`);
    }

    const data = await response.json();
    const ollamaContent = data.message?.content || '';

    return c.json({
      content: [{ type: 'text', text: ollamaContent }]
    }, 200);

  } catch (err) {
    console.error('LLM proxy error:', err);
    return c.json({ error: 'Ollama unreachable' }, 503);
  }
});

export default llmRoutes;
