import { getConfig } from '../storage/local.js';
import api from '../storage/api.js';

export async function callLLM({ system, user, jsonMode = true }) {
  const config = await getConfig();
  const provider = config.llmProvider || 'anthropic';
  const anthropicKey = config.anthropicKey;

  let rawText = '';

  if (provider === 'ollama') {
    const res = await api.post('/llm', { system, user, model: config.modelName });
    rawText = res.content[0].text;
  } else if (provider === 'anthropic') {
    if (!config.anthropicKey) throw new Error('Missing Anthropic key');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: config.modelName || 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic Error ${response.status}: ${errorBody}`);
    }
    const data = await response.json();
    rawText = data.content[0].text;
  } else {
    // OpenAI, Gemini, and OpenRouter all support the standard OpenAI format
    let endpoint = '';
    let apiKey = '';
    let defaultModel = '';

    if (provider === 'openai') {
      endpoint = 'https://api.openai.com/v1/chat/completions';
      apiKey = config.openaiKey;
      defaultModel = 'gpt-4o-mini';
    } else if (provider === 'gemini') {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      apiKey = config.geminiKey;
      defaultModel = 'gemini-1.5-flash';
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = config.openrouterKey;
      defaultModel = 'openrouter/auto';
    }

    if (!apiKey) throw new Error(`Missing API key for ${provider}`);

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: (config.modelName === 'google/gemini-2.5-flash' || config.modelName === 'google/gemini-1.5-flash' ? 'openrouter/auto' : config.modelName) || defaultModel,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${provider} Error ${response.status}: ${errorBody}`);
    }
    const data = await response.json();
    rawText = data.choices[0].message.content;
  }

  if (!jsonMode) return rawText;

  let stripped = rawText.trim();
  if (stripped.startsWith('```')) {
    const lines = stripped.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines[lines.length - 1].startsWith('```')) lines.pop();
    stripped = lines.join('\n').trim();
  }

  try {
    return JSON.parse(stripped);
  } catch (err) {
    throw new Error(`Failed to parse JSON from LLM. Raw text: ${rawText}`);
  }
}
