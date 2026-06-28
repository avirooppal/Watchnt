import type { Result } from '@watchnt/shared';
import { success, failure } from '@watchnt/shared';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface ExportedFile {
  /** Relative path inside the vault, e.g. "WatchNT/My Video.md" */
  path: string;
  /** UTC timestamp of the last WatchNT export for this file */
  exportedAt: number;
  /** SHA-256 hex digest of the content at export time */
  contentHash: string;
  /** Source content ID in WatchNT */
  contentId: string;
}

export interface ConflictMetadata {
  path: string;
  contentId: string;
  /** The hash stored from the last WatchNT export */
  exportedHash: string;
  /** The hash observed on disk right now */
  observedHash: string;
  detectedAt: number;
}

export type VaultCapability = 'file-system-access-api' | 'download-import';

// ────────────────────────────────────────────────────────────
// VaultTracker
// ────────────────────────────────────────────────────────────

/**
 * Tracks files exported to an Obsidian vault and detects external edits.
 *
 * On Chromium-based browsers the File System Access API is used to watch the
 * vault directory in real time.  On all other browsers (Firefox, Safari, older
 * Chromium) we fall back to the download/import model — notes are downloaded
 * as a .zip archive and re-imported manually.
 */
export class VaultTracker {
  /** In-memory registry of last-exported file state */
  private registry: Map<string, ExportedFile> = new Map();

  /**
   * Detect which capability is available in this browser.
   */
  public detectCapability(): VaultCapability {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      return 'file-system-access-api';
    }
    return 'download-import';
  }

  /**
   * Record a successful export so we can detect future conflicts.
   */
  public trackExport(file: ExportedFile): void {
    this.registry.set(file.path, file);
  }

  /**
   * Return every file we have exported.
   */
  public getTrackedFiles(): ExportedFile[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check a file for a conflict: if its current hash differs from the
   * stored export hash, the user has edited it outside WatchNT.
   */
  public checkConflict(path: string, currentHash: string): ConflictMetadata | null {
    const tracked = this.registry.get(path);
    if (!tracked) return null;
    if (tracked.contentHash === currentHash) return null;
    return {
      path,
      contentId: tracked.contentId,
      exportedHash: tracked.contentHash,
      observedHash: currentHash,
      detectedAt: Date.now()
    };
  }

  /**
   * Scan tracked files using the File System Access API (Chromium only).
   * Resolves with a list of conflict metadata for any changed files.
   *
   * @param dirHandle  A FileSystemDirectoryHandle obtained from showDirectoryPicker()
   */
  public async scanForChanges(dirHandle: FileSystemDirectoryHandle): Promise<Result<ConflictMetadata[]>> {
    if (this.detectCapability() !== 'file-system-access-api') {
      return failure(new Error('File System Access API not available in this browser'));
    }

    const conflicts: ConflictMetadata[] = [];

    try {
      for (const tracked of this.registry.values()) {
        try {
          const parts = tracked.path.split('/');
          const fileName = parts[parts.length - 1];

          // Walk sub-directories if present
          let handle: FileSystemDirectoryHandle = dirHandle;
          for (let i = 0; i < parts.length - 1; i++) {
            handle = await handle.getDirectoryHandle(parts[i]);
          }

          const fileHandle = await handle.getFileHandle(fileName);
          const file = await fileHandle.getFile();
          const text = await file.text();
          const currentHash = await this._sha256(text);

          const conflict = this.checkConflict(tracked.path, currentHash);
          if (conflict) conflicts.push(conflict);
        } catch {
          // File may have been deleted — not a conflict, skip
        }
      }

      return success(conflicts);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * SHA-256 of a string, returned as a hex digest.
   * Uses Web Crypto — available in all modern browsers and Node 19+.
   */
  private async _sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
