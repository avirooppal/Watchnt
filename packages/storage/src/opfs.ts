import { success, failure, type Result } from '@watchnt/shared';
import type { BlobStorage } from './interfaces.js';

export class OPFSBlobStorage implements BlobStorage {
  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
      throw new Error('OPFS is not supported in this environment');
    }
    return await navigator.storage.getDirectory();
  }

  // Normalizes path and resolves directories, creating them if needed
  private async resolveFileHandle(
    path: string, 
    create: boolean
  ): Promise<FileSystemFileHandle> {
    const parts = path.split('/').filter(p => p.length > 0);
    if (parts.length === 0) {
      throw new Error('Invalid path');
    }
    
    const fileName = parts.pop()!;
    let currentDir = await this.getRoot();
    
    for (const dirName of parts) {
      currentDir = await currentDir.getDirectoryHandle(dirName, { create });
    }
    
    return await currentDir.getFileHandle(fileName, { create });
  }
  
  // Recursively resolves parent dir for deletion or existence check
  private async resolveParentDir(path: string): Promise<[FileSystemDirectoryHandle, string]> {
    const parts = path.split('/').filter(p => p.length > 0);
    if (parts.length === 0) {
      throw new Error('Invalid path');
    }
    const fileName = parts.pop()!;
    let currentDir = await this.getRoot();
    
    for (const dirName of parts) {
      currentDir = await currentDir.getDirectoryHandle(dirName, { create: false });
    }
    
    return [currentDir, fileName];
  }

  async write(path: string, buffer: ArrayBuffer): Promise<Result<void>> {
    try {
      const handle = await this.resolveFileHandle(path, true);
      // createWritable is part of File System Access API which OPFS implements
      // We cast to any here to avoid TS errors if the lib is missing it
      const writable = await (handle as any).createWritable();
      await writable.write(buffer);
      await writable.close();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async read(path: string): Promise<Result<ArrayBuffer>> {
    try {
      const handle = await this.resolveFileHandle(path, false);
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      return success(buffer);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async delete(path: string): Promise<Result<void>> {
    try {
      const [parentDir, fileName] = await this.resolveParentDir(path);
      await parentDir.removeEntry(fileName);
      return success(undefined);
    } catch (err) {
      // If it's a NotFoundError, we might consider it successful since it's already gone
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        return success(undefined);
      }
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async exists(path: string): Promise<Result<boolean>> {
    try {
      await this.resolveFileHandle(path, false);
      return success(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        return success(false);
      }
      // If the parent directory isn't found, it also doesn't exist
      if (err instanceof Error && err.name === 'NotFoundError') {
        return success(false);
      }
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }
  
  /**
   * Helper for hash-addressing blobs (e.g. media, cached files)
   * Converts 'abcdef123' to 'blobs/ab/cd/abcdef123.bin'
   */
  public getHashPath(hash: string, extension: string = 'bin'): string {
    if (hash.length < 4) return `blobs/${hash}.${extension}`;
    const p1 = hash.substring(0, 2);
    const p2 = hash.substring(2, 4);
    return `blobs/${p1}/${p2}/${hash}.${extension}`;
  }
}
