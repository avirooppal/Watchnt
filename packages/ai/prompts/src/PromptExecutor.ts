import { PromptAsset } from './PromptAsset';
import { PromptRenderer } from './PromptRenderer';
import { PromptValidator } from './PromptValidator';
import { AIProvider } from '@watchnt/providers';
import { generateText, generateObject } from 'ai';

export class PromptExecutor {
    constructor(private provider: AIProvider, private modelString: string) {}

    async execute<T = string>(asset: PromptAsset, inputs: Record<string, any>): Promise<T> {
        PromptValidator.validateInputs(asset, inputs);
        const rendered = PromptRenderer.render(asset, inputs);
        
        const model = this.provider.getModel(this.modelString);

        if (asset.outputFormat === 'json' && asset.zodSchema) {
            // Use Vercel AI SDK's generateObject for structured JSON
            const result = await generateObject({
                model,
                schema: asset.zodSchema,
                prompt: rendered
            });
            return result.object as T;
        }

        // Standard text generation
        const result = await generateText({
            model,
            prompt: rendered
        });
        
        return result.text as unknown as T;
    }
}
