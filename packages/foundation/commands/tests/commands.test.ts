
import { describe, it, expect } from 'vitest';
import { CommandDispatcher, Command } from '../src/Command';

describe('CommandDispatcher', () => {
    it('should route commands to handlers', async () => {
        const dispatcher = new CommandDispatcher();
        dispatcher.register('StartMeeting', {
            handle: async (c: Command<{id: string}>) => c.payload.id
        });
        const result = await dispatcher.dispatch({ id: '1', type: 'StartMeeting', payload: { id: 'm1' } });
        expect(result).toBe('m1');
    });
});
