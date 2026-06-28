import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/bus.js';
import { StepRegistry, type PipelineStep } from '../../src/step.js';
import type { PipelineEvent } from '../../src/events.js';
import { createContentId } from '@watchnt/shared';

describe('Pipeline Integration', () => {
  it('executes sequence of steps based on events', async () => {
    const bus = new EventBus();
    const registry = new StepRegistry();
    
    const executionOrder: string[] = [];
    
    // Fake Step 1: Listens to content.created, emits audio.ready
    const audioExtractorStep: PipelineStep = {
      name: 'AudioExtractor',
      context: 'worker',
      handles: ['content.created'],
      execute: async (ev, b) => {
        executionOrder.push('AudioExtractor');
        if (ev.type === 'content.created') {
          await b.publish({
            type: 'audio.ready',
            payload: { contentId: ev.payload.content.id, mimeType: 'audio/wav' }
          });
        }
      }
    };

    // Fake Step 2: Listens to audio.ready, emits transcript.ready
    const sttStep: PipelineStep = {
      name: 'SpeechToText',
      context: 'main',
      handles: ['audio.ready'],
      execute: async (ev, b) => {
        executionOrder.push('SpeechToText');
        if (ev.type === 'audio.ready') {
          await b.publish({
            type: 'transcript.ready',
            payload: { 
              contentId: ev.payload.contentId, 
              transcript: { 
                id: createContentId('t1') as any, // casting NoteId mock
                contentId: ev.payload.contentId, 
                objectType: 'transcript',
                createdAt: 0 as any,
                segments: []
              } 
            }
          });
        }
      }
    };
    
    registry.register(audioExtractorStep);
    registry.register(sttStep);
    
    // Wire bus to registry dynamically
    bus.subscribeAll(async (event) => {
      const steps = registry.getStepsForEvent(event.type);
      for (const step of steps) {
        await step.execute(event, bus);
      }
    });
    
    // Start the pipeline
    const contentId = createContentId('c1');
    await bus.publish({
      type: 'content.created',
      payload: {
        content: {
          id: contentId,
          type: 'video',
          createdAt: 0 as any
        }
      }
    });
    
    // Check if the steps ran in sequence
    expect(executionOrder).toEqual(['AudioExtractor', 'SpeechToText']);
  });
});
