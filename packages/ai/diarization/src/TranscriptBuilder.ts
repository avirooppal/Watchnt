import { TranscriptSegment } from '@watchnt/transcription';
import { SpeakerTimeline } from './SpeakerTimeline';

export interface AttributedDialogue {
    speakerId: string;
    text: string;
    startTime: number;
    endTime: number;
}

export class TranscriptBuilder {
    static build(segments: TranscriptSegment[], timeline: SpeakerTimeline): AttributedDialogue[] {
        const result: AttributedDialogue[] = [];

        for (const segment of segments) {
            // Find the speaker who was speaking the most during this segment's duration
            let maxOverlap = 0;
            let assignedSpeaker = 'Unknown Speaker';

            for (const speaker of timeline) {
                // Calculate overlap between segment and speaker timeline
                const overlapStart = Math.max(segment.startTime, speaker.startTime);
                const overlapEnd = Math.min(segment.endTime, speaker.endTime);
                const overlap = overlapEnd - overlapStart;

                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    assignedSpeaker = speaker.speakerId;
                }
            }

            // Assign speaker to this segment
            const attributed: AttributedDialogue = {
                speakerId: assignedSpeaker,
                text: segment.text,
                startTime: segment.startTime,
                endTime: segment.endTime
            };

            // Merge with previous segment if it's the same speaker
            if (result.length > 0 && result[result.length - 1].speakerId === assignedSpeaker) {
                const prev = result[result.length - 1];
                prev.text += ` ${attributed.text}`;
                prev.endTime = attributed.endTime;
            } else {
                result.push(attributed);
            }
        }

        return result;
    }
}
