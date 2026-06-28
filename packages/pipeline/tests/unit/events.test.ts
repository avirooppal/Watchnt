import { describe, it, expect } from 'vitest';
import type { PipelineEvent, JobCompletedEvent } from '../../src/events.js';
import { assertExhaustiveEvent } from '../../src/events.js';
import { createJobId } from '@watchnt/shared';

describe('PipelineEvent Model', () => {
  it('correctly types a specific event', () => {
    const ev: JobCompletedEvent = {
      type: 'job.completed',
      payload: {
        jobId: createJobId('job123'),
        stepName: 'test-step'
      }
    };
    
    expect(ev.type).toBe('job.completed');
    expect(ev.payload.jobId).toBe('job123');
  });

  it('allows exhaustive type narrowing', () => {
    const handleEvent = (ev: PipelineEvent) => {
      switch (ev.type) {
        case 'content.created':
        case 'audio.ready':
        case 'transcript.ready':
        case 'chunks.ready':
        case 'embeddings.ready':
        case 'summary.ready':
        case 'graph.updated':
        case 'export.finished':
        case 'job.started':
        case 'job.progress':
        case 'job.completed':
        case 'job.failed':
        case 'job.cancelled':
          return true;
        default:
          assertExhaustiveEvent(ev);
          return false;
      }
    };

    const ev: PipelineEvent = {
      type: 'job.progress',
      payload: {
        jobId: createJobId('job1'),
        stepName: 'test',
        progress: 50
      }
    };

    expect(handleEvent(ev)).toBe(true);
  });
});
