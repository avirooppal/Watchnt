import { describe, it, expect } from 'vitest';
import { createContentId, createTimestamp, createHash } from '../../src/ids.js';

describe('ids', () => {
  it('creates valid branded IDs', () => {
    const id = createContentId('test-id');
    expect(id).toBe('test-id');
  });

  it('throws on empty string for IDs', () => {
    expect(() => createContentId('')).toThrow('ID cannot be empty');
  });

  it('creates valid timestamp', () => {
    const ts = createTimestamp(1234567890);
    expect(ts).toBe(1234567890);
  });

  it('throws on negative timestamp', () => {
    expect(() => createTimestamp(-1)).toThrow('Timestamp must be positive');
  });

  it('creates valid hash', () => {
    const hash = createHash('abc');
    expect(hash).toBe('abc');
  });

  it('throws on empty hash', () => {
    expect(() => createHash('')).toThrow('Hash cannot be empty');
  });
});
