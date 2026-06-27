import { pipeline, env } from '@huggingface/transformers';
import { TranscriptSegment } from './TranscriptSegment';
import { TranscriptionService } from './TranscriptionService';

// Configure transformers environment for browser OPFS storage
env.allowLocalModels = false; // We only download from HF model hub
env.useBrowserCache = true; // Cache weights in OPFS/IndexedDB so it only downloads once

export class TransformersWhisperService implements TranscriptionService {
    private transcriber: any = null;
    private initPromise: Promise<void> | null = null;
    
    constructor() {
        this.initPromise = this.init();
    }

    private async init() {
        if (!this.transcriber) {
            // Load the Whisper Tiny English model
            this.transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                device: 'webgpu', // Fallback to wasm automatically handled by Transformers.js v3 if not supported
                dtype: 'q8', // Use int8 quantized model for smaller footprint
            });
        }
    }

    async transcribe(audioBuffer: ArrayBuffer): Promise<TranscriptSegment[]> {
        await this.initPromise;
        if (!this.transcriber) throw new Error("Whisper model failed to initialize");

        // Transformers.js expects Float32Array containing mono 16kHz audio.
        // It also handles WAV headers or ArrayBuffers directly in some pipeline configurations,
        // but passing the audio data properly is key. We assume audioBuffer is already a WAV file 
        // or Float32Array PCM data from the AudioRecorder.
        
        // For standard processing: pass the audio buffer or blob
        const result = await this.transcriber(new Float32Array(audioBuffer), {
            chunk_length_s: 30, // Whisper chunks are 30s
            stride_length_s: 5,
            return_timestamps: true,
        });

        const segments: TranscriptSegment[] = [];
        
        if (result && result.chunks) {
            result.chunks.forEach((chunk: any, index: number) => {
                segments.push({
                    id: `seg-${index}`,
                    text: chunk.text.trim(),
                    startTime: chunk.timestamp[0],
                    endTime: chunk.timestamp[1] || chunk.timestamp[0] + 2.0, // fallback for trailing chunks
                    confidence: chunk.score || 0.95 // Score might not always be present in whisper timestamps
                });
            });
        } else if (result && result.text) {
            // Fallback if chunks are missing
            segments.push({
                id: 'seg-0',
                text: result.text.trim(),
                startTime: 0,
                endTime: 5.0,
                confidence: 0.95
            });
        }

        return segments;
    }
}
