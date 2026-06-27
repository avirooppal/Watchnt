
export interface WorkflowStep<TInput, TOutput> {
    name: string;
    execute(input: TInput): Promise<TOutput>;
}

export interface Pipeline<TInitial, TFinal> {
    id: string;
    execute(input: TInitial): Promise<TFinal>;
}
