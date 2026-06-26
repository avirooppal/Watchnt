import { callLLM } from '../shared/llm.js';

export async function runCaptureAgent(session) {
  const sortedChunks = [...(session.chunks || [])].sort((a, b) => {
    return (a.startTime || a.timestamp || 0) - (b.startTime || b.timestamp || 0);
  });

  const rawTranscript = sortedChunks.map(c => `[${c.startTime || 0}s] ${c.text}`).join('\n');

  const system = `You are a transcript cleaner. Remove filler words, fix run-ons, group into ~300-400 word blocks. Ensure you read the [Xs] timestamps to output accurate startTime and endTime for each block.
Return exactly a JSON object matching this schema:
{ "cleanedBlocks": [{ "text": "cleaned text block...", "startTime": 0, "endTime": 120 }] }`;

  const user = `Raw Transcript:\n${rawTranscript}`;

  const result = await callLLM({ system, user });
  
  if (!result || !result.cleanedBlocks || result.cleanedBlocks.length === 0) {
    throw new Error('CaptureAgent returned empty or invalid cleanedBlocks');
  }

  return result;
}
