/**
 * @watchnt/memory — Memory Engine Interface Seam
 *
 * This package is a deliberate stub. The full memory taxonomy (episodic,
 * semantic, procedural) described in Blueprint §16 (Future Vision) is NOT
 * implemented here. The empty interfaces are published so that other
 * packages can reference the types without importing AI-heavy dependencies.
 *
 * When the future vision phase begins, implement these interfaces and remove
 * this comment block.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Memory taxonomy seams  (all intentionally empty / minimal)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * A discrete memory item stored by the engine.
 * Fields are intentionally minimal — the schema will be extended in v4.
 */
export interface MemoryItem {
  id: string;
  type: MemoryType;
  payload: unknown;
  createdAt: number;
}

/** High-level memory categories from Blueprint §16. */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

/**
 * Contract that any concrete MemoryEngine must fulfil.
 * No implementation is provided in this milestone.
 */
export interface MemoryEngine {
  store(item: Omit<MemoryItem, 'id' | 'createdAt'>): Promise<string>;
  recall(query: string, limit?: number): Promise<MemoryItem[]>;
  forget(id: string): Promise<void>;
}

/**
 * A no-op MemoryEngine that satisfies the interface without persisting anything.
 * Use this as a placeholder until the real engine is implemented.
 */
export class NullMemoryEngine implements MemoryEngine {
  async store(_item: Omit<MemoryItem, 'id' | 'createdAt'>): Promise<string> {
    return 'noop-memory-id';
  }

  async recall(_query: string, _limit?: number): Promise<MemoryItem[]> {
    return [];
  }

  async forget(_id: string): Promise<void> {
    // noop
  }
}
