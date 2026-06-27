
export interface AudioChunk {
    data: Float32Array;
    timestamp: number;
}
export interface AudioCapture {
    start(): Promise<void>;
    stop(): Promise<void>;
}
