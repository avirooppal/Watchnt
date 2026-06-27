import { pipeline, FeatureExtractionPipeline, env } from '@huggingface/transformers';

export interface EmbeddingService {
    embed(text: string): Promise<number[]>;
}

export class TransformersEmbeddingService implements EmbeddingService {
    private pipe: FeatureExtractionPipeline | null = null;
    private initPromise: Promise<FeatureExtractionPipeline> | null = null;

    constructor(private modelName: string = 'nomic-ai/nomic-embed-text-v1.5') {
        // Disable local model check in browser environments
        env.allowLocalModels = false;
        // Optionally enable WebGPU if available in the environment
        if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
            if (env.backends.onnx.wasm) {
                env.backends.onnx.wasm.numThreads = 1; // Fallback sync
            }
        }
    }

    private async getPipeline(): Promise<FeatureExtractionPipeline> {
        if (this.pipe) return this.pipe;
        
        if (!this.initPromise) {
            this.initPromise = pipeline('feature-extraction', this.modelName, {
                dtype: 'q8',
                device: 'webgpu' // Will fallback to wasm if webgpu is unavailable
            }) as Promise<FeatureExtractionPipeline>;
        }
        
        this.pipe = await this.initPromise;
        return this.pipe;
    }

    async embed(text: string): Promise<number[]> {
        const extractor = await this.getPipeline();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        
        // Output is a Tensor, we need to convert to standard number[]
        return Array.from(output.data);
    }
}
