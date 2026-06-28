import type { PipelineStep, ExecutionContext, PipelineEvent, EventBus } from '@watchnt/pipeline';
import type { TranscriptObject } from '@watchnt/shared';

export class DiarizationStep implements PipelineStep {
  name = 'DiarizationStep';
  context: ExecutionContext = 'worker';
  handles: PipelineEvent['type'][] = ['transcript.ready'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'transcript.ready') return;
    
    const { contentId, transcript } = event.payload;

    await bus.publish({
      type: 'job.started',
      payload: { jobId: 'diarize-' + contentId, stepName: this.name, contentId }
    });

    // MOCK: In a real implementation, we would extract audio embeddings using an ONNX model
    // and run a clustering algorithm like agglomerative clustering.
    
    // HEURISTIC FALLBACK: 
    // We will assign speaker IDs based on a simple heuristic:
    // If the gap between segments > 1500ms, increment speaker index.
    let currentSpeakerIndex = 1;
    let lastEndMs = 0;

    const diarizedTranscript: TranscriptObject = {
      ...transcript,
      segments: transcript.segments.map(segment => {
        if (segment.startMs - lastEndMs > 1500 && lastEndMs !== 0) {
          // Large pause detected, assume speaker change
          currentSpeakerIndex = (currentSpeakerIndex % 2) + 1; // Toggle between Speaker 1 and 2 for simplicity
        }
        lastEndMs = segment.endMs;
        
        return {
          ...segment,
          speakerId: `Speaker ${currentSpeakerIndex}`
        };
      })
    };

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 50));

    await bus.publish({
      type: 'diarization.ready',
      payload: { contentId, transcript: diarizedTranscript }
    });

    await bus.publish({
      type: 'job.completed',
      payload: { jobId: 'diarize-' + contentId, stepName: this.name, result: diarizedTranscript }
    });
  }
}
