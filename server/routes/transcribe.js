import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const transcribeRoutes = new Hono();

transcribeRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  let tempFile = null;

  try {
    const body = await c.req.json();
    const { audio, mimeType, durationSec } = body;

    if (!audio || !mimeType || durationSec === undefined) {
      return c.json({ error: 'audio, mimeType, and durationSec are required' }, 400);
    }

    const randomId = crypto.randomBytes(8).toString('hex');
    // We use os.tmpdir() to gracefully handle both Docker (/tmp) and local Windows runs
    tempFile = path.join(os.tmpdir(), `watchnt-${randomId}.webm`);

    const audioBuffer = Buffer.from(audio, 'base64');
    await fs.writeFile(tempFile, audioBuffer);

    try {
      // Read the file from disk as a Blob for FormData
      const fileBuffer = await fs.readFile(tempFile);
      const audioBlob = new Blob([fileBuffer], { type: mimeType });
      
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `audio.webm`);

      const whisperHost = 'http://whisper-api:9000';
      const response = await fetch(`${whisperHost}/asr?task=transcribe&language=en&output=json`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API responded with ${response.status}`);
      }

      const result = await response.json();
      
      return c.json({
        transcript: result.text || '',
        segments: result.segments || []
      }, 200);

    } catch (fetchErr) {
      console.error('Whisper fetch error:', fetchErr);
      return c.json({ error: 'Transcriber unavailable' }, 503);
    }
  } catch (err) {
    console.error('Transcribe route error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  } finally {
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {}); // Ensure cleanup
    }
  }
});

export default transcribeRoutes;
