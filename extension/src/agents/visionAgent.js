import { getConfig } from '../storage/local.js';
import api from '../storage/api.js';
import logger from '../shared/logger.js';

export async function processVisionFrame(base64Image) {
  try {
    const config = await getConfig();
    const provider = config.llmProvider || 'anthropic';

    const systemPrompt = "You are a helpful assistant analyzing a screenshot of a video or meeting. Describe any important text, code, slides, or visual context visible in the image. Be concise. If there is nothing of note, reply with 'NO_SIGNIFICANT_VISUALS'.";
    
    // Clean base64 prefix if needed
    const b64Data = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');

    let textDescription = '';

    if (provider === 'ollama') {
      // Use local ollama via our backend proxy
      const res = await api.post('/llm', {
        system: systemPrompt,
        user: "What is shown in this frame?",
        model: 'llava', // force llava for vision locally
        images: [b64Data]
      });
      textDescription = res.content[0].text;
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: b64Data }
              },
              { type: 'text', text: "What is shown in this frame?" }
            ]
          }]
        })
      });
      const data = await response.json();
      textDescription = data.content ? data.content[0].text : '';
    } else {
      // OpenAI / OpenRouter standard vision format
      let endpoint = '';
      let apiKey = '';
      let defaultModel = '';

      if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
        apiKey = config.openaiKey;
        defaultModel = 'gpt-4o-mini';
      } else if (provider === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        apiKey = config.openrouterKey;
        defaultModel = 'openrouter/auto';
      } else if (provider === 'gemini') {
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        apiKey = config.geminiKey;
        defaultModel = 'gemini-1.5-flash';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: "What is shown in this frame?" },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64Data}` } }
              ]
            }
          ]
        })
      });
      const data = await response.json();
      textDescription = data.choices ? data.choices[0].message.content : '';
    }

    if (textDescription && !textDescription.includes('NO_SIGNIFICANT_VISUALS')) {
      logger.log('[VisionAgent] Extracted visual context:', textDescription);
      return `[Visual Context]: ${textDescription}`;
    }
    return null;
  } catch (err) {
    logger.error('[VisionAgent] Failed to process frame:', err);
    return null;
  }
}
