import { Hono } from 'hono';

const youtubeRoutes = new Hono();

youtubeRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { videoId } = body;

    if (!videoId) {
      return c.json({ error: 'videoId is required' }, 400);
    }

    // Call the internal Python transcript service
    const pythonServiceUrl = process.env.TRANSCRIPT_SERVICE_URL || 'http://transcript-service:8000';
    const response = await fetch(`${pythonServiceUrl}/transcript?video_id=${videoId}`);

    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: `Transcript service failed: ${err}` }, response.status);
    }

    const data = await response.json();
    
    // In the future, we could trigger the LLM pipeline directly from here.
    // For now, return the transcript to the extension which will trigger the LLM.
    return c.json(data);

  } catch (err) {
    console.error('YouTube API error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default youtubeRoutes;
