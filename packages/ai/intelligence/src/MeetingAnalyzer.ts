import { PromptExecutor, PromptAsset } from '@watchnt/prompts';
import { TranscriptSegment } from '@watchnt/transcription';
import { z } from 'zod';

export const SummarySchema = z.object({
    summary: z.string().describe('A 2-3 sentence high-level summary of the meeting.')
});

export const SUMMARY_PROMPT: PromptAsset = {
    id: 'core-summary',
    version: '1.0.0',
    description: 'Generates a high-level summary of the meeting.',
    template: 'Summarize the following meeting transcript in 2-3 sentences.\n\nTranscript:\n{{ transcript }}',
    inputSchema: { transcript: 'string' },
    outputFormat: 'json',
    zodSchema: SummarySchema
};

export const ActionItemsSchema = z.object({
    actions: z.array(z.string()).describe('A list of action items extracted from the meeting.')
});

export const ACTION_ITEMS_PROMPT: PromptAsset = {
    id: 'core-actions',
    version: '1.0.0',
    description: 'Extracts action items from the meeting.',
    template: 'Extract action items from the transcript.\n\nTranscript:\n{{ transcript }}',
    inputSchema: { transcript: 'string' },
    outputFormat: 'json',
    zodSchema: ActionItemsSchema
};

export const DecisionsSchema = z.object({
    decisions: z.array(z.string()).describe('A list of key decisions made during the meeting.')
});

export const DECISIONS_PROMPT: PromptAsset = {
    id: 'core-decisions',
    version: '1.0.0',
    description: 'Extracts decisions made in the meeting.',
    template: 'Extract key decisions from the transcript.\n\nTranscript:\n{{ transcript }}',
    inputSchema: { transcript: 'string' },
    outputFormat: 'json',
    zodSchema: DecisionsSchema
};

export class MeetingAnalyzer {
    constructor(private executor: PromptExecutor) {}

    private formatTranscript(segments: TranscriptSegment[]): string {
        return segments.map(s => `[${s.speakerId || 'Unknown'}]: ${s.text}`).join('\n');
    }

    async generateSummary(segments: TranscriptSegment[]): Promise<string> {
        const text = this.formatTranscript(segments);
        const result = await this.executor.execute<{ summary: string }>(SUMMARY_PROMPT, { transcript: text });
        return result.summary;
    }

    async extractActionItems(segments: TranscriptSegment[]): Promise<string[]> {
        const text = this.formatTranscript(segments);
        const result = await this.executor.execute<{ actions: string[] }>(ACTION_ITEMS_PROMPT, { transcript: text });
        return result.actions;
    }

    async extractDecisions(segments: TranscriptSegment[]): Promise<string[]> {
        const text = this.formatTranscript(segments);
        const result = await this.executor.execute<{ decisions: string[] }>(DECISIONS_PROMPT, { transcript: text });
        return result.decisions;
    }
}
