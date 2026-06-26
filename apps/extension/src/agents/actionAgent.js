import { callLLM } from '../shared/llm.js';

export async function runActionAgent({ cleanedBlocks, insights }) {
  const fullText = cleanedBlocks.map((b, i) => `[Block ${i}] ${b.text}`).join('\n\n');
  
  const system = `You are an action detection agent. Find explicit action items, decisions made/announced, questions raised but unanswered, and external resources/tools/links mentioned.
Return exactly a JSON object matching this schema:
{
  "actions": [{ "text": "string", "owner": "string or null", "deadline": "string or null" }],
  "decisions": ["string"],
  "questions": ["string"],
  "resources": [{ "title": "string", "url": "string or null" }]
}`;

  const user = `Transcript:\n${fullText}\n\nInsights:\n${JSON.stringify(insights)}`;

  const result = await callLLM({ system, user });

  if (!result || !result.actions) {
    throw new Error('ActionAgent returned invalid shape');
  }

  return result;
}
