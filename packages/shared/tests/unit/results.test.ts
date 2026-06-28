import { describe, it, expect } from 'vitest';
import { success, failure, isSuccess, isFailure } from '../../src/results.js';

describe('results', () => {
  it('creates a success result', () => {
    const result = success('hello');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('hello');
    }
    
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
  });

  it('creates a failure result', () => {
    const error = new Error('something went wrong');
    const result = failure(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(error);
    }
    
    expect(isFailure(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
  });
});
