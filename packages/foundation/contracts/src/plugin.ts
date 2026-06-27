
export interface CapturePlugin {
    id: string;
    name: string;
    initialize(): Promise<void>;
    startCapture(): Promise<MediaStream>;
    stopCapture(): Promise<void>;
    getParticipants(): Promise<string[]>;
}
