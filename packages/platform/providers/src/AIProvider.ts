import { LanguageModel } from 'ai';

export interface AIProviderOptions {
    maxTokens?: number;
    temperature?: number;
    system?: string;
}

export interface AIProvider {
    /**
     * Vends the underlying Vercel AI SDK LanguageModel object 
     * which can be passed directly to `generateText` or `streamText`.
     */
    getModel(modelName: string): LanguageModel;
}
