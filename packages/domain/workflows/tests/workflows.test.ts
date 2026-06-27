
import { describe, it, expect } from 'vitest';
import { WorkflowRegistry } from '../src/WorkflowRegistry';
import { WorkflowExecutor } from '../src/WorkflowExecutor';

describe('WorkflowExecutor', () => {
    it('should execute a pipeline sequentially', async () => {
        const registry = new WorkflowRegistry();
        
        registry.register({
            id: 'step1',
            execute: async (input: number) => input + 1
        });
        registry.register({
            id: 'step2',
            execute: async (input: number) => input * 2
        });
        
        const executor = new WorkflowExecutor(registry);
        const result = await executor.executePipeline<number>({
            id: 'pipeline1',
            steps: ['step1', 'step2']
        }, 1);
        
        expect(result).toBe(4);
    });
});
