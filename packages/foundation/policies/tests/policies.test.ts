
import { describe, it, expect } from 'vitest';
import { OfflineOnlyPolicy } from '../src/Policy';

describe('Policies', () => {
    it('should evaluate correctly', () => {
        const p = new OfflineOnlyPolicy();
        expect(p.evaluate({ user: null, environment: null })).toBe(true);
    });
});
