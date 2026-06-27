
import { SpeakerTimeline } from './SpeakerTimeline';

export interface DiarizationService {
    diarize(audioBuffer: ArrayBuffer): Promise<SpeakerTimeline>;
}

export class MockDiarizationService implements DiarizationService {
    async diarize(audioBuffer: ArrayBuffer): Promise<SpeakerTimeline> {
        return [
            { speakerId: 'Speaker A', startTime: 0, endTime: 5.5 },
            { speakerId: 'Speaker B', startTime: 5.5, endTime: 10.0 }
        ];
    }
}
