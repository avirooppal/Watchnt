
import { AudioSource } from './AudioSource';

export class AudioRecorder {
    private chunks: Float32Array[] = [];
    private isRecording = false;
    
    constructor(private source: AudioSource) {
        this.source.onData(data => {
            if (this.isRecording) {
                this.chunks.push(new Float32Array(data));
            }
        });
    }

    async start(): Promise<void> {
        this.chunks = [];
        this.isRecording = true;
        await this.source.start();
    }

    async stop(): Promise<void> {
        this.isRecording = false;
        await this.source.stop();
    }

    getAudioData(): Float32Array {
        const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }
    
    getSampleRate(): number {
        return this.source.getSampleRate();
    }
}
