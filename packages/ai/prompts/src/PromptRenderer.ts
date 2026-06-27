import { PromptAsset } from './PromptAsset';

export class PromptRenderer {
    static render(asset: PromptAsset, inputs: Record<string, any>): string {
        let rendered = asset.template;
        for (const [key, value] of Object.entries(inputs)) {
            rendered = rendered.replace(new RegExp(`\\{\\{ ${key} \\}\\}`, 'g'), String(value));
        }
        return rendered;
    }
}
