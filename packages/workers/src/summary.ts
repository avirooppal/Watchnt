import type { PipelineStep, ExecutionContext, PipelineEvent, EventBus } from '@watchnt/pipeline';
import { createNoteId, createTimestamp } from '@watchnt/shared';

export class SummarizationStep implements PipelineStep {
  name = 'SummarizationStep';
  context: ExecutionContext = 'worker';
  handles: PipelineEvent['type'][] = ['transcript.ready'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'transcript.ready') return;
    const { contentId, transcript } = event.payload;

    await bus.publish({
      type: 'job.started',
      payload: { jobId: 'summarize-' + contentId, stepName: this.name, contentId }
    });

    // Simulate work: in a real implementation we would:
    // 1. Initialize WebLLM (or reuse cached prompt state)
    // 2. Feed the transcript to a LLaMA/Phi model running locally via WebGPU
    await new Promise(resolve => setTimeout(resolve, 150));

    // Combine all transcript segments for the mock input
    const fullText = transcript.segments.map(s => s.text).join(' ');

    const mockSummary = {
      id: createNoteId('sum1'),
      contentId,
      objectType: 'summary' as const,
      createdAt: createTimestamp(0),
      text: `This is a mock AI summary based on ${fullText.length} characters of transcript.`,
      bullets: [
        'First mock key point',
        'Second mock key point'
      ]
    };

    await bus.publish({
      type: 'summary.ready',
      payload: { contentId, summary: mockSummary }
    });

    await bus.publish({
      type: 'job.completed',
      payload: { jobId: 'summarize-' + contentId, stepName: this.name, result: mockSummary }
    });
  }
}
