
import { describe, it, expect } from 'vitest';
import { StateMachine } from '../src/StateMachine';

describe('StateMachine', () => {
    it('should transition correctly', () => {
        const sm = new StateMachine('Draft', [
            { from: 'Draft', event: 'Start', to: 'Ready' }
        ]);
        sm.transition('Start');
        expect(sm.getState()).toBe('Ready');
    });
});
