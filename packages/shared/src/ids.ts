// Branded types for type-safe IDs
export type Brand<K, T> = K & { __brand: T };

export type ContentId = Brand<string, 'ContentId'>;
export type JobId = Brand<string, 'JobId'>;
export type NoteId = Brand<string, 'NoteId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type ProviderId = Brand<string, 'ProviderId'>;
export type PluginId = Brand<string, 'PluginId'>;

// Timestamp and hash types
export type TimestampMs = Brand<number, 'TimestampMs'>;
export type ContentHash = Brand<string, 'ContentHash'>;

export function createContentId(id: string): ContentId {
  if (!id) throw new Error('ID cannot be empty');
  return id as ContentId;
}

export function createJobId(id: string): JobId {
  if (!id) throw new Error('ID cannot be empty');
  return id as JobId;
}

export function createNoteId(id: string): NoteId {
  if (!id) throw new Error('ID cannot be empty');
  return id as NoteId;
}

export function createAssetId(id: string): AssetId {
  if (!id) throw new Error('ID cannot be empty');
  return id as AssetId;
}

export function createProviderId(id: string): ProviderId {
  if (!id) throw new Error('ID cannot be empty');
  return id as ProviderId;
}

export function createPluginId(id: string): PluginId {
  if (!id) throw new Error('ID cannot be empty');
  return id as PluginId;
}

export function createTimestamp(ms: number): TimestampMs {
  if (ms < 0) throw new Error('Timestamp must be positive');
  return ms as TimestampMs;
}

export function createHash(hash: string): ContentHash {
  if (!hash) throw new Error('Hash cannot be empty');
  return hash as ContentHash;
}
