import type { PipelineStep, ExecutionContext, PipelineEvent, EventBus } from '@watchnt/pipeline';
import type { OcrTask, OcrResult, OcrSourceType } from '@watchnt/shared';
import { createNoteId } from '@watchnt/shared';

/**
 * OcrStep — Optical Character Recognition pipeline step.
 *
 * Subscribes to 'content.created' events where the content type is a
 * supported OCR source (pdf | screenshot | article).  In production this
 * would call the AI provider OCR method via the abstraction layer.  This
 * milestone provides a typed stub so the pipeline integration is wired up
 * correctly before a real OCR model is available.
 */
export class OcrStep implements PipelineStep {
  name = 'OcrStep';
  context: ExecutionContext = 'worker';
  handles: PipelineEvent['type'][] = ['content.created'];

  /** Content types that require OCR */
  private readonly ocrTypes: OcrSourceType[] = ['pdf', 'screenshot', 'article'];

  async execute(event: PipelineEvent, bus: EventBus): Promise<void> {
    if (event.type !== 'content.created') return;

    const { content } = event.payload;

    // Only process OCR-eligible content types
    if (!this.ocrTypes.includes(content.type as OcrSourceType)) return;

    const task: OcrTask = {
      contentId: content.id,
      sourceType: content.type as OcrSourceType,
      dataRef: (content.sourceUri ?? ''),
      pageIndex: 0
    };

    await bus.publish({
      type: 'job.started',
      payload: { jobId: `ocr-${content.id}`, stepName: this.name, contentId: content.id }
    });

    // STUB: Real implementation calls AI provider OCR endpoint
    // const provider = await getActiveProvider();
    // const ocrResult = await provider.ocr(task);
    const mockResult: OcrResult = {
      contentId: content.id,
      text: `[OCR mock output for ${content.type}: ${content.title ?? content.id}]`,
      confidence: 0.95,
      pageIndex: task.pageIndex
    };

    // Emit chunks.ready so the downstream embedding step can vectorise the text
    await bus.publish({
      type: 'chunks.ready',
      payload: {
        contentId: content.id,
        chunks: [{
          id: createNoteId(`ocr-chunk-${content.id}`),
          contentId: content.id,
          objectType: 'chunk',
          createdAt: Date.now() as any,
          text: mockResult.text
        }]
      }
    });

    await bus.publish({
      type: 'job.completed',
      payload: { jobId: `ocr-${content.id}`, stepName: this.name, result: mockResult }
    });
  }
}
