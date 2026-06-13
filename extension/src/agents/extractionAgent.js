import { callLLM } from '../shared/llm.js';

export async function runExtractionAgent({ cleanedBlocks, context }) {
  const fullText = cleanedBlocks.map((b, i) => `[Block ${i}] ${b.text}`).join('\n\n');
  
  const system = `You are an insight extraction agent. Extract max 10 insights, max 5 notable quotes, and key concepts/terms with definitions.
Use the provided context:
Topic: ${context.primaryTopic}
Type: ${context.contentType}

Return exactly a JSON object matching this schema:
{
  "insights": [{ "text": "string", "blockIndex": 0, "importance": 5 }],
  "quotes": [{ "text": "string", "blockIndex": 0 }],
  "concepts": [{ "term": "string", "definition": "string" }]
}`;

  const user = fullText;

  const result = await callLLM({ system, user });
  
  if (!result || !result.insights) {
    throw new Error('ExtractionAgent returned invalid shape');
  }

  return result;
}
