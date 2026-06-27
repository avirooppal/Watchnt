
export type MeetingState = 'Draft' | 'Ready' | 'Recording' | 'Recorded' | 'Queued' | 'Transcribing' | 'Diarizing' | 'Analyzing' | 'Embedding' | 'Indexed' | 'Completed' | 'Archived';

export interface MeetingMetadata {
    title: string;
    startTime: number;
    endTime?: number;
    participants: string[];
}

export interface Meeting {
    readonly id: string;
    readonly state: MeetingState;
    readonly metadata: MeetingMetadata;
    readonly audioRef?: string;
    readonly transcriptRef?: string;
    readonly speakers: any[];
    readonly summary?: string;
    readonly actionItems: string[];
    readonly decisions: string[];
    readonly timeline: any[];
    readonly memoryRefs: string[];
    readonly embeddingsRef?: string;
    readonly artifacts: Record<string, string>;
    readonly schemaVersion: 'v1';
}

export class MeetingEntity {
    private data: Meeting;
    constructor(data: Meeting) {
        this.data = data;
    }
    
    get snapshot(): Meeting {
        return { ...this.data };
    }
}
