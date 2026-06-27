
export interface MemoryEntity {
    id: string;
    type: string;
    value: string;
    metadata: Record<string, any>;
}

export interface MeetingMemory {
    version: 'v1';
    meetingId: string;
    summary: string;
    actionItems: string[];
    decisions: string[];
    entities: MemoryEntity[];
}
