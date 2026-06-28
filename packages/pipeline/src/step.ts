import type { PipelineEvent } from './events.js';
import type { EventBus } from './bus.js';

export type ExecutionContext = 'main' | 'worker' | 'shared-worker' | 'webgpu';

export interface PipelineStep {
  name: string;
  context: ExecutionContext;
  handles: PipelineEvent['type'][];
  execute(event: PipelineEvent, bus: EventBus): Promise<void>;
}

export class StepRegistry {
  private steps: Map<string, PipelineStep> = new Map();

  public register(step: PipelineStep): void {
    if (this.steps.has(step.name)) {
      throw new Error(`Step ${step.name} is already registered`);
    }
    this.steps.set(step.name, step);
  }

  public getStepsForEvent(eventType: PipelineEvent['type']): PipelineStep[] {
    const result: PipelineStep[] = [];
    for (const step of this.steps.values()) {
      if (step.handles.includes(eventType)) {
        result.push(step);
      }
    }
    return result;
  }
  
  public getAllSteps(): PipelineStep[] {
    return Array.from(this.steps.values());
  }
}
