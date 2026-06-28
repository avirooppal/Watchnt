import { EventBus } from '@watchnt/pipeline';
import { TranscriptionStep, EmbeddingStep, SummarizationStep, ProcessingCoordinator } from '@watchnt/workers';
import { dbStore } from './db.svelte.js';
import { createContentId } from '@watchnt/shared';

class PipelineStore {
  bus = new EventBus();
  coordinator: ProcessingCoordinator | null = null;
  transcription: TranscriptionStep | null = null;
  embedding: EmbeddingStep | null = null;
  summary: SummarizationStep | null = null;

  init() {
    if (!dbStore.facade) throw new Error("DB not initialized");
    if (this.coordinator) return; // Already initialized
    
    this.coordinator = new ProcessingCoordinator(this.bus, dbStore.facade);
    this.transcription = new TranscriptionStep(this.bus);
    this.embedding = new EmbeddingStep(this.bus);
    this.summary = new SummarizationStep(this.bus);
  }

  async uploadVideo(file: File) {
    if (!dbStore.facade || !this.coordinator) {
      throw new Error("Pipeline not initialized");
    }
    
    const contentId = createContentId(file.name.replace(/[^a-zA-Z0-9]/g, ''));
    
    // 1. Create content record
    await dbStore.facade.content.create({
      id: contentId,
      type: 'video',
      createdAt: Date.now(),
      title: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    
    // 2. Write to OPFS (using standard Web APIs)
    try {
      const root = await navigator.storage.getDirectory();
      const fh = await root.getFileHandle(contentId, { create: true });
      // @ts-ignore - createWritable is not universally in standard lib types yet
      const writable = await fh.createWritable();
      await writable.write(file);
      await writable.close();
    } catch (err) {
      console.warn("Failed to write to OPFS (might not be supported in this environment):", err);
    }
    
    // 3. Trigger pipeline
    await this.bus.publish({
      type: 'audio.ready',
      payload: {
        contentId: contentId,
        audioPath: `opfs://${contentId}`
      }
    });
  }
}

export const pipelineStore = new PipelineStore();
