
import { TranscriptSegment } from '@watchnt/transcription';
import { SpeakerTimeline, SpeakerSegment } from '@watchnt/diarization';

export class TranscriptBuilder {
    static merge(segments: TranscriptSegment[], timeline: SpeakerTimeline): TranscriptSegment[] {
        return segments.map(segment => {
            const enriched = { ...segment };
            
            let bestSpeaker = 'Unknown Speaker';
            let maxOverlap = 0;

            for (const s of timeline) {
                // Calculate intersection bounds
                const overlapStart = Math.max(segment.startTime, s.startTime);
                const overlapEnd = Math.min(segment.endTime, s.endTime);
                
                if (overlapStart < overlapEnd) {
                    const overlapDuration = overlapEnd - overlapStart;
                    if (overlapDuration > maxOverlap) {
                        maxOverlap = overlapDuration;
                        bestSpeaker = s.speakerId;
                    }
                }
            }

            // Only assign if the overlap is non-trivial (e.g. > 100ms or majority of a tiny segment)
            const segmentDuration = segment.endTime - segment.startTime;
            if (maxOverlap > 0 && (maxOverlap > 0.1 || maxOverlap >= segmentDuration * 0.5)) {
                enriched.speakerId = bestSpeaker;
            } else {
                enriched.speakerId = 'Unknown Speaker';
            }

            return enriched;
        });
    }
}
