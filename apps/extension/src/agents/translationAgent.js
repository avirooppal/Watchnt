import { callLLM } from '../shared/llm.js';

export async function runTranslationAgent({ cleanedBlocks, detectedLanguage, languageConfidence }) {
  if (detectedLanguage === 'en' || languageConfidence < 0.7) {
    return { cleanedBlocks };
  }

  const system = `You are a translation agent. Translate the provided transcript blocks from ${detectedLanguage} to English.
Return exactly a JSON object matching the input shape:
{ "cleanedBlocks": [{ "text": "translated english text...", "startTime": 0, "endTime": 10 }] }`;

  const user = JSON.stringify({ cleanedBlocks });

  const result = await callLLM({ system, user });

  if (!result || !result.cleanedBlocks || result.cleanedBlocks.length === 0) {
    throw new Error('TranslationAgent returned empty or invalid cleanedBlocks');
  }

  return result;
}
