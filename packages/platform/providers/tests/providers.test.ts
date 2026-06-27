import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '../src/ProviderRegistry';

vi.mock('@ai-sdk/openai', () => {
    return {
        createOpenAI: vi.fn().mockReturnValue((model: string) => ({ provider: 'openai', model }))
    };
});

describe('ProviderRegistry', () => {
    it('should resolve openai models to the OpenAI client', () => {
        const registry = new ProviderRegistry({ openai: 'test-key' });
        const model = registry.getModel('openai/gpt-4o') as any;
        
        expect(model.provider).toBe('openai');
        expect(model.model).toBe('gpt-4o');
    });

    it('should resolve ollama models via OpenAI compatibility layer', () => {
        const registry = new ProviderRegistry();
        const model = registry.getModel('ollama/llama3') as any;
        
        expect(model.provider).toBe('openai'); // Ollama uses OpenAI compat
        expect(model.model).toBe('llama3');
    });

    it('should throw on invalid format', () => {
        const registry = new ProviderRegistry();
        expect(() => registry.getModel('gpt-4o')).toThrow(/Invalid model string format/);
    });
});
