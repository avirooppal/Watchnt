export interface SpeakerSegment {
    speakerId: string;
    startTime: number;
    endTime: number;
}

export type SpeakerTimeline = SpeakerSegment[];

export interface SpeakerMetadata {
    id: string;
    name?: string;
    role?: string;
    colorHex?: string;
}

export function calculateTalkTime(timeline: SpeakerTimeline): Record<string, number> {
    const talkTime: Record<string, number> = {};
    for (const segment of timeline) {
        const duration = segment.endTime - segment.startTime;
        if (duration > 0) {
            talkTime[segment.speakerId] = (talkTime[segment.speakerId] || 0) + duration;
        }
    }
    return talkTime;
}
