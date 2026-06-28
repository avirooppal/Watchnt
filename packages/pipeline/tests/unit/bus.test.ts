import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/bus.js';
import { StepRegistry } from '../../src/step.js';
import type { PipelineEvent } from '../../src/events.js';
import { createJobId } from '@watchnt/shared';

describe('EventBus', () => {
  it('allows publish and subscribe', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.subscribe('job.started', handler);
    
    const ev: PipelineEvent = { 
      type: 'job.started', 
      payload: { jobId: createJobId('j1'), stepName: 'test' } 
    };
    
    await bus.publish(ev);
    
    expect(handler).toHaveBeenCalledWith(ev);
  });

  it('allows wildcard subscriptions', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.subscribeAll(handler);
    
    const ev: PipelineEvent = { 
      type: 'job.cancelled', 
      payload: { jobId: createJobId('j2'), stepName: 'test' } 
    };
    
    await bus.publish(ev);
    
    expect(handler).toHaveBeenCalledWith(ev);
  });

  it('aggregates errors from multiple handlers', async () => {
    const bus = new EventBus();
    
    bus.subscribe('job.failed', () => { throw new Error('Error 1'); });
    bus.subscribe('job.failed', async () => { throw new Error('Error 2'); });
    
    const ev: PipelineEvent = { 
      type: 'job.failed', 
      payload: { jobId: createJobId('j3'), stepName: 'test', error: new Error('Oom') } 
    };
    
    await expect(bus.publish(ev)).rejects.toThrow(AggregateError);
  });
});

describe('StepRegistry', () => {
  it('registers and retrieves steps', () => {
    const registry = new StepRegistry();
    
    registry.register({
      name: 'TestStep',
      context: 'worker',
      handles: ['audio.ready'],
      execute: async () => {}
    });
    
    const steps = registry.getStepsForEvent('audio.ready');
    expect(steps.length).toBe(1);
    expect(steps[0].name).toBe('TestStep');
    
    expect(() => registry.register({
      name: 'TestStep',
      context: 'main',
      handles: [],
      execute: async () => {}
    })).toThrow('Step TestStep is already registered');
  });
});
