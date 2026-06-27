
import { WorkflowStep } from './Workflow';

export class WorkflowRegistry {
    private steps = new Map<string, WorkflowStep<any, any>>();

    register(step: WorkflowStep<any, any>) {
        this.steps.set(step.id, step);
    }

    get(id: string): WorkflowStep<any, any> | undefined {
        return this.steps.get(id);
    }
}
