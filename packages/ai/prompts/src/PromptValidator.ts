
import { PromptAsset } from './PromptAsset';

export class PromptValidator {
    static validateInputs(asset: PromptAsset, inputs: Record<string, any>): void {
        for (const key of Object.keys(asset.inputSchema)) {
            if (!(key in inputs)) {
                throw new Error(`Missing required prompt input: ${key}`);
            }
        }
    }
}
