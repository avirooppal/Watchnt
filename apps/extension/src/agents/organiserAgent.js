import { callLLM } from '../shared/llm.js';

export async function runOrganiserAgent({ cards, context }) {
  const system = `You are an organization agent. Assign 2-5 tags per card (lowercase, short phrases), and select exactly ONE primary category for the entire set of cards from this list: ["engineering", "design", "business", "science", "health", "finance", "productivity", "other"].
Return exactly a JSON object matching this schema:
{
  "cards": [
    {
      "title": "string",
      "summary": "string",
      "insights": ["string"],
      "actions": ["string"],
      "concepts": ["string"],
      "sourceStart": 0,
      "sourceEnd": 120,
      "tags": ["string"]
    }
  ],
  "category": "string"
}`;

  const user = JSON.stringify({ cards, context });

  const result = await callLLM({ system, user });

  if (!result || !result.cards || !result.category) {
    throw new Error('OrganiserAgent returned invalid shape');
  }

  return result;
}
