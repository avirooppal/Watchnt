
export interface MemoryEntity {
    id: string;
    text: string;
    sourceMeetingId: string;
    vector?: number[];
    timestamp: number;
}
