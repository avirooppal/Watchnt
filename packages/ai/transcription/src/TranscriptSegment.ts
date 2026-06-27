
export interface TranscriptSegment {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
    speakerId?: string; // To be populated during diarization
}
