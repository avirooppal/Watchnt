import { callLLM } from '../shared/llm.js';

export async function runCardAgent({ context, insights, actions, cleanedBlocks }) {
  const system = `You are a knowledge structuring agent. Create 1-5 knowledge cards from the provided materials. Each card represents one coherent unit or topic.
Return exactly a JSON object matching this schema:
{
  "cards": [{
    "title": "string",
    "summary": "string",
    "insights": ["string"],
    "actions": ["string"],
    "concepts": ["string"],
    "sourceStart": 0,
    "sourceEnd": 120
  }]
}`;

  const user = JSON.stringify({
    context,
    insights,
    actions,
    transcriptSample: cleanedBlocks.map(b => `[${b.startTime}s - ${b.endTime}s] ${b.text}`).join('\n')
  });

  const result = await callLLM({ system, user });

  if (!result || !result.cards || result.cards.length === 0 || !result.cards[0].title || !result.cards[0].summary) {
    throw new Error('CardAgent returned invalid shape');
  }

  return result;
}
