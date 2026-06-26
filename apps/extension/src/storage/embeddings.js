import { getConfig } from './local.js';
import { api } from './api.js';

export async function generateEmbedding(text) {
  const config = await getConfig();
  const provider = config.llmProvider || 'anthropic';
  const anthropicKey = config.anthropicKey;

  if (provider === 'ollama' || !anthropicKey) {
    const res = await api.post('/embed', { text });
    return res.embedding;
  } else {
    const prompt = `Generate a semantic embedding vector for the following text. You MUST return EXACTLY a JSON array of 768 floats and nothing else.\n\nText: ${text}`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: "You are an embedding generation API. Return ONLY a valid JSON array of 768 floating point numbers.",
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic Embedding Error: ${await response.text()}`);
    }

    const data = await response.json();
    let rawText = data.content[0].text.trim();
    
    if (rawText.startsWith('```')) {
      const lines = rawText.split('\n');
      if (lines[0].startsWith('```')) lines.shift();
      if (lines[lines.length - 1].startsWith('```')) lines.pop();
      rawText = lines.join('\n').trim();
    }

    const embedding = JSON.parse(rawText);
    if (!Array.isArray(embedding) || embedding.length !== 768) {
      throw new Error("Invalid embedding shape returned from Anthropic.");
    }
    return embedding;
  }
}

export async function semanticSearch(queryText, limit = 20) {
  const embedding = await generateEmbedding(queryText);
  const results = await api.post('/search', { embedding, limit, threshold: 0.5 });
  return results.results || results; // Handle cases where results are nested
}
