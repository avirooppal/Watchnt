import { z } from 'zod';

export interface PromptAsset {
    id: string;
    version: string;
    description: string;
    template: string;
    inputSchema: Record<string, string>;
    outputFormat: 'json' | 'text';
    zodSchema?: z.ZodType<any>; // Strongly typed output schema for JSON mode
}
