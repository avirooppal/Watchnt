
export interface AudioSource {
    start(): Promise<void>;
    stop(): Promise<void>;
    onData(callback: (data: Float32Array) => void): void;
    getSampleRate(): number;
}
