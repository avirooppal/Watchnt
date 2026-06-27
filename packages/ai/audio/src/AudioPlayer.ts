
export interface AudioPlayer {
    load(audioBuffer: ArrayBuffer): Promise<void>;
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    getDuration(): number;
    getCurrentTime(): number;
    seek(timeSeconds: number): void;
    onEnd(callback: () => void): void;
}

// A simple generic stub for a web-based AudioContext player
export class WebAudioPlayer implements AudioPlayer {
    private buffer: ArrayBuffer | null = null;
    private isPlaying = false;
    private onEndCallback?: () => void;

    async load(audioBuffer: ArrayBuffer): Promise<void> {
        this.buffer = audioBuffer.slice(0);
        // In a browser, we would decode this using AudioContext.decodeAudioData()
    }

    async play(): Promise<void> {
        if (!this.buffer) throw new Error("No audio loaded");
        this.isPlaying = true;
    }

    pause(): void {
        this.isPlaying = false;
    }

    stop(): void {
        this.isPlaying = false;
        if (this.onEndCallback) this.onEndCallback();
    }

    getDuration(): number {
        return this.buffer ? 100 : 0; // Mock duration
    }

    getCurrentTime(): number {
        return this.isPlaying ? 10 : 0; // Mock current time
    }

    seek(timeSeconds: number): void {
        // Implementation
    }

    onEnd(callback: () => void): void {
        this.onEndCallback = callback;
    }
}
