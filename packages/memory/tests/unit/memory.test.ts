import { describe, it, expect } from 'vitest';
import {
  NullMemoryEngine,
  type MemoryEngine,
  type MemoryItem,
  type MemoryType
} from '../../src/index.js';

describe('Memory Engine – interface exports', () => {
  it('exports MemoryEngine interface (compile-time check via NullMemoryEngine)', () => {
    const engine: MemoryEngine = new NullMemoryEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.store).toBe('function');
    expect(typeof engine.recall).toBe('function');
    expect(typeof engine.forget).toBe('function');
  });

  it('NullMemoryEngine.store returns a string id without throwing', async () => {
    const engine = new NullMemoryEngine();
    const id = await engine.store({ type: 'episodic', payload: { text: 'test' } });
    expect(typeof id).toBe('string');
  });

  it('NullMemoryEngine.recall returns an empty array', async () => {
    const engine = new NullMemoryEngine();
    const items = await engine.recall('anything');
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(0);
  });

  it('NullMemoryEngine.forget resolves without throwing', async () => {
    const engine = new NullMemoryEngine();
    await expect(engine.forget('some-id')).resolves.toBeUndefined();
  });

  it('MemoryType union covers episodic, semantic, procedural', () => {
    const types: MemoryType[] = ['episodic', 'semantic', 'procedural'];
    expect(types).toHaveLength(3);
  });
});
