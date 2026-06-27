
import { TranscriptSegment } from './TranscriptSegment';

export interface TranscriptionService {
    transcribe(audioBuffer: ArrayBuffer): Promise<TranscriptSegment[]>;
    transcribeStream?(audioChunk: Float32Array): Promise<TranscriptSegment[]>;
}

export class MockWhisperService implements TranscriptionService {
    async transcribe(audioBuffer: ArrayBuffer): Promise<TranscriptSegment[]> {
        // Simulating transcription delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
            {
                id: 'seg-1',
                text: 'This is a mocked transcription of the meeting.',
                startTime: 0,
                endTime: 5.5,
                confidence: 0.98
            },
            {
                id: 'seg-2',
                text: 'It proves the runtime works end-to-end.',
                startTime: 5.5,
                endTime: 10.0,
                confidence: 0.95
            }
        ];
    }
}
