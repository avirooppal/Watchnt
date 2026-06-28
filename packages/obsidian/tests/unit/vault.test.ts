import { describe, it, expect, beforeEach } from 'vitest';
import { VaultTracker } from '../../src/vault.js';
import type { ExportedFile } from '../../src/vault.js';

describe('VaultTracker – change tracking', () => {
  let tracker: VaultTracker;

  const fileA: ExportedFile = {
    path: 'WatchNT/My Video.md',
    exportedAt: Date.now(),
    contentHash: 'abc123',
    contentId: 'c-001'
  };

  beforeEach(() => {
    tracker = new VaultTracker();
  });

  it('tracks an exported file', () => {
    tracker.trackExport(fileA);
    const tracked = tracker.getTrackedFiles();
    expect(tracked).toHaveLength(1);
    expect(tracked[0].path).toBe(fileA.path);
  });

  it('returns no conflict when hash matches', () => {
    tracker.trackExport(fileA);
    const conflict = tracker.checkConflict(fileA.path, 'abc123');
    expect(conflict).toBeNull();
  });

  it('returns conflict metadata when hash differs', () => {
    tracker.trackExport(fileA);
    const conflict = tracker.checkConflict(fileA.path, 'def456');
    expect(conflict).not.toBeNull();
    expect(conflict!.exportedHash).toBe('abc123');
    expect(conflict!.observedHash).toBe('def456');
    expect(conflict!.contentId).toBe('c-001');
    expect(conflict!.detectedAt).toBeGreaterThan(0);
  });

  it('returns no conflict for an untracked path', () => {
    const conflict = tracker.checkConflict('WatchNT/Unknown.md', 'xyz');
    expect(conflict).toBeNull();
  });

  it('overwrites a tracked file when re-exported', () => {
    tracker.trackExport(fileA);
    tracker.trackExport({ ...fileA, contentHash: 'newHash999' });
    const conflict = tracker.checkConflict(fileA.path, 'abc123');
    // Now abc123 differs from the updated export hash newHash999 → conflict
    expect(conflict).not.toBeNull();
    expect(conflict!.exportedHash).toBe('newHash999');
  });
});

describe('VaultTracker – capability detection', () => {
  it('falls back to download-import when File System Access API is absent', () => {
    // In vitest/jsdom showDirectoryPicker is not present
    const tracker = new VaultTracker();
    const cap = tracker.detectCapability();
    expect(cap).toBe('download-import');
  });

  it('scanForChanges returns failure when FSAA is unavailable', async () => {
    const tracker = new VaultTracker();
    const res = await tracker.scanForChanges({} as FileSystemDirectoryHandle);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.message).toContain('File System Access API');
    }
  });
});
