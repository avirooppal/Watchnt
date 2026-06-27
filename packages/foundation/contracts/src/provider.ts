
export interface ProviderCapabilities {
    streaming: boolean;
    embeddings: boolean;
    vision: boolean;
    jsonMode: boolean;
    functionCalling: boolean;
    reasoning: boolean;
}

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    model: string;
}
