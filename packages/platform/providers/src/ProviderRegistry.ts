import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { AIProvider } from './AIProvider';

export class ProviderRegistry implements AIProvider {
    private apiKeys: Record<string, string> = {};

    constructor(initialKeys?: Record<string, string>) {
        if (initialKeys) {
            this.apiKeys = { ...initialKeys };
        }
    }

    setKey(provider: string, key: string) {
        this.apiKeys[provider] = key;
    }

    getModel(modelString: string): LanguageModel {
        // modelString format: "provider/model-name", e.g. "openai/gpt-4o"
        const [provider, modelName] = modelString.split('/');
        
        if (!provider || !modelName) {
            throw new Error(`Invalid model string format: ${modelString}. Expected provider/modelName`);
        }

        switch (provider) {
            case 'openai': {
                const openai = createOpenAI({
                    apiKey: this.apiKeys['openai'] || ''
                });
                return openai(modelName);
            }
            case 'anthropic': {
                const anthropic = createAnthropic({
                    apiKey: this.apiKeys['anthropic'] || ''
                });
                return anthropic(modelName);
            }
            case 'gemini':
            case 'google': {
                const google = createGoogleGenerativeAI({
                    apiKey: this.apiKeys['google'] || ''
                });
                return google(modelName);
            }
            case 'ollama': {
                // Ollama typically uses OpenAI compatible endpoints
                const ollama = createOpenAI({
                    baseURL: 'http://localhost:11434/v1',
                    apiKey: 'ollama'
                });
                return ollama(modelName);
            }
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
}
