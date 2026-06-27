
import { describe, it, expect } from 'vitest';
import { AudioRecorder } from '../src/AudioRecorder';
import { WAVEncoder } from '../src/WAVEncoder';
import { AudioSource } from '../src/AudioSource';

class MockAudioSource implements AudioSource {
    private callback: ((data: Float32Array) => void) | null = null;
    
    async start() {
        if (this.callback) {
            this.callback(new Float32Array([0.5, -0.5, 0.1]));
            this.callback(new Float32Array([-0.1, 0.9]));
        }
    }
    async stop() {}
    onData(cb: (data: Float32Array) => void) {
        this.callback = cb;
    }
    getSampleRate() { return 16000; }
}

describe('Audio Pipeline Milestone 1A', () => {
    it('should record audio and return combined buffer', async () => {
        const source = new MockAudioSource();
        const recorder = new AudioRecorder(source);
        
        await recorder.start();
        await recorder.stop();
        
        const data = recorder.getAudioData();
        expect(data.length).toBe(5);
        expect(data[0]).toBe(0.5);
        expect(recorder.getSampleRate()).toBe(16000);
    });

    it('should encode float32 array to WAV format', () => {
        const data = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
        const wavBuffer = WAVEncoder.encode(data, 16000);
        
        expect(wavBuffer.byteLength).toBe(44 + 5 * 2);
        
        const view = new DataView(wavBuffer);
        const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        expect(header).toBe('RIFF');
        
        const format = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
        expect(format).toBe('WAVE');
    });
});
