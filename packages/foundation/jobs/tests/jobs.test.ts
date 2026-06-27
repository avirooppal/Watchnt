
import { describe, it, expect } from 'vitest';
import { JobQueue } from '../src/Job';

describe('JobQueue', () => {
    it('should enqueue jobs', () => {
        const q = new JobQueue();
        q.enqueue({ id: '1', type: 'Transcription', payload: {}, status: 'queued' });
    });
});
