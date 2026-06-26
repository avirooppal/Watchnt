import { callLLM } from '../shared/llm.js';

export async function runContextAgent({ session, cleanedBlocks }) {
  const sampleText = cleanedBlocks.slice(0, 2).map(b => b.text).join('\n\n');
  const metadata = `Title: ${session.title || 'N/A'}\nChannel: ${session.channel || 'N/A'}`;
  
  const system = `You are a context identification agent. Analyze the video metadata and first few transcript blocks.
Return exactly a JSON object matching this schema:
{
  "contentType": "tutorial" | "interview" | "lecture" | "talk" | "podcast" | "other",
  "primaryTopic": "string",
  "audience": "string",
  "entities": ["string"],
  "detectedLanguage": "en", // ISO 639-1 code (e.g. en, fr, es)
  "languageConfidence": 0.9 // number between 0 and 1
}`;

  const user = `Metadata:\n${metadata}\n\nTranscript Snippet:\n${sampleText}`;

  const result = await callLLM({ system, user });

  if (!result || !result.contentType || !result.detectedLanguage) {
    throw new Error('ContextAgent returned invalid shape');
  }

  return result;
}
