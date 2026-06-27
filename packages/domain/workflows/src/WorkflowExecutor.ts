
import { PipelineDefinition } from './Workflow';
import { WorkflowRegistry } from './WorkflowRegistry';

export class WorkflowExecutor {
    constructor(private registry: WorkflowRegistry) {}

    async executePipeline<T>(definition: PipelineDefinition, initialInput: any): Promise<T> {
        let currentInput = initialInput;
        for (const stepId of definition.steps) {
            const step = this.registry.get(stepId);
            if (!step) throw new Error(`Step ${stepId} not found`);
            currentInput = await step.execute(currentInput);
        }
        return currentInput as T;
    }
}
