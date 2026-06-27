
export interface WorkflowStep<TInput, TOutput> {
    id: string;
    execute(input: TInput): Promise<TOutput>;
}

export interface PipelineDefinition {
    id: string;
    steps: string[];
}

export interface Workflow<TInitial, TFinal> {
    id: string;
    execute(input: TInitial): Promise<TFinal>;
    cancel(): void;
}
