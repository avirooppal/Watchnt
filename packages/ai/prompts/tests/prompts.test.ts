import { describe, it, expect, vi } from 'vitest';
import { PromptAsset, PromptExecutor } from '../src';
import { AIProvider } from '@watchnt/providers';
import { z } from 'zod';

vi.mock('ai', () => ({
    generateObject: vi.fn().mockResolvedValue({
        object: { summary: "Test meeting summary." }
    }),
    generateText: vi.fn().mockResolvedValue({
        text: "Raw text response."
    })
}));

class MockProvider implements AIProvider {
    getModel(modelName: string): any {
        return { modelName }; // dummy model
    }
}

describe('Prompt Engine', () => {
    it('should validate, render, execute, and return structured JSON correctly', async () => {
        const asset: PromptAsset = {
            id: 'summary-prompt',
            version: 'v1',
            description: 'Summarizes a meeting',
            template: 'Summarize this: {{ transcript }}',
            inputSchema: { transcript: 'string' },
            outputFormat: 'json',
            zodSchema: z.object({ summary: z.string() })
        };

        const executor = new PromptExecutor(new MockProvider(), 'openai/gpt-4o');
        
        const result = await executor.execute<{summary: string}>(asset, { transcript: 'Hello world' });
        
        expect(result.summary).toBe('Test meeting summary.');
    });

    it('should throw on missing inputs', async () => {
        const asset: PromptAsset = {
            id: 'summary-prompt',
            version: 'v1',
            description: '...',
            template: '{{ transcript }}',
            inputSchema: { transcript: 'string' },
            outputFormat: 'text'
        };

        const executor = new PromptExecutor(new MockProvider(), 'openai/gpt-4o');
        
        await expect(executor.execute(asset, {})).rejects.toThrow('Missing required prompt input: transcript');
    });
});
