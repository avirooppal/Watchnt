import type { PipelineStep, ExecutionContext, PipelineEvent, EventBus } from '@watchnt/pipeline';
import { createNoteId, createTimestamp } from '@watchnt/shared';

export class TranscriptionStep implements PipelineStep {
  name = 'TranscriptionStep';
  context: ExecutionContext = 'worker';
  handles: PipelineEvent['type'][] = ['audio.ready'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'audio.ready') return;
    const { contentId, buffer, mimeType } = event.payload;

    bus.publish({
      type: 'job.started',
      payload: { jobId: 'transcribe-' + contentId, stepName: this.name, contentId }
    });

    // MOCK: In a real implementation, we would compile and run whisper.cpp WASM here
    // const whisper = await loadWhisperCpp();
    // const transcript = await whisper.transcribe(buffer);

    bus.publish({
      type: 'job.progress',
      payload: { jobId: 'transcribe-' + contentId, stepName: this.name, progress: 50 }
    });

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock successful transcription result
    const mockTranscript = {
      id: createNoteId('t1'),
      contentId,
      objectType: 'transcript' as const,
      createdAt: createTimestamp(0),
      segments: [
        { startMs: 0, endMs: 2000, text: 'This is a mock transcription' }
      ]
    };

    bus.publish({
      type: 'transcript.ready',
      payload: { contentId, transcript: mockTranscript }
    });

    bus.publish({
      type: 'job.completed',
      payload: { jobId: 'transcribe-' + contentId, stepName: this.name, result: mockTranscript }
    });
  }
}
