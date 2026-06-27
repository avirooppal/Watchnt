
export interface TranscriptSegment {
    id: string;
    meetingId: string;
    speakerId?: string;
    text: string;
    startTime: number;
    endTime: number;
}
