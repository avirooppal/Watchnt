
export interface TelemetryEvent {
    name: string;
    durationMs?: number;
    metadata?: Record<string, any>;
    timestamp: Date;
}

export interface TelemetryTracker {
    track(event: TelemetryEvent): void;
    startTimer(name: string): () => void;
}

export class OfflineTracker implements TelemetryTracker {
    private events: TelemetryEvent[] = [];
    track(event: TelemetryEvent) {
        this.events.push(event);
    }
    startTimer(name: string) {
        const start = Date.now();
        return () => {
            this.track({ name, durationMs: Date.now() - start, timestamp: new Date() });
        };
    }
}
