import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OPFSBlobStorage } from '../../src/opfs.js';
import { isSuccess, isFailure } from '@watchnt/shared';

describe('OPFSBlobStorage', () => {
  let fileSystem: Map<string, any>;

  beforeEach(() => {
    fileSystem = new Map();

    const createMockDirHandle = (pathPrefix: string = '') => ({
      getDirectoryHandle: vi.fn().mockImplementation(async (name, options) => {
        const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
        if (!options?.create && !fileSystem.has(`dir:${fullPath}`)) {
          const err = new Error('Not found');
          err.name = 'NotFoundError';
          throw err;
        }
        if (options?.create && !fileSystem.has(`dir:${fullPath}`)) {
          fileSystem.set(`dir:${fullPath}`, true);
        }
        return createMockDirHandle(fullPath);
      }),
      getFileHandle: vi.fn().mockImplementation(async (name, options) => {
        const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
        if (!options?.create && !fileSystem.has(`file:${fullPath}`)) {
          const err = new Error('Not found');
          err.name = 'NotFoundError';
          throw err;
        }
        if (options?.create && !fileSystem.has(`file:${fullPath}`)) {
          fileSystem.set(`file:${fullPath}`, new ArrayBuffer(0));
        }

        return {
          getFile: async () => ({
            arrayBuffer: async () => fileSystem.get(`file:${fullPath}`)
          }),
          createWritable: async () => {
            let buffer: ArrayBuffer;
            return {
              write: async (buf: ArrayBuffer) => { buffer = buf; },
              close: async () => { fileSystem.set(`file:${fullPath}`, buffer); }
            };
          }
        };
      }),
      removeEntry: vi.fn().mockImplementation(async (name) => {
        const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
        if (!fileSystem.has(`file:${fullPath}`) && !fileSystem.has(`dir:${fullPath}`)) {
          const err = new Error('Not found');
          err.name = 'NotFoundError';
          throw err;
        }
        fileSystem.delete(`file:${fullPath}`);
        fileSystem.delete(`dir:${fullPath}`);
      })
    });

    vi.stubGlobal('navigator', {
      storage: {
        getDirectory: async () => createMockDirHandle()
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates consistent hash paths', () => {
    const storage = new OPFSBlobStorage();
    expect(storage.getHashPath('abcdef12345')).toBe('blobs/ab/cd/abcdef12345.bin');
    expect(storage.getHashPath('12')).toBe('blobs/12.bin');
  });

  it('writes and reads files correctly in deeply nested paths', async () => {
    const storage = new OPFSBlobStorage();
    const hashPath = storage.getHashPath('1a2b3c4d5e');
    
    // Write
    const writeData = new Uint8Array([1, 2, 3]).buffer;
    const writeRes = await storage.write(hashPath, writeData);
    expect(isSuccess(writeRes)).toBe(true);

    // Read
    const readRes = await storage.read(hashPath);
    expect(isSuccess(readRes)).toBe(true);
    if (isSuccess(readRes)) {
      const readData = new Uint8Array(readRes.value);
      expect(readData[0]).toBe(1);
      expect(readData[2]).toBe(3);
    }
  });

  it('checks existence and handles deletions gracefully', async () => {
    const storage = new OPFSBlobStorage();
    const path = 'some/test/file.txt';

    let exists = await storage.exists(path);
    expect(isSuccess(exists)).toBe(true);
    if (isSuccess(exists)) expect(exists.value).toBe(false);

    await storage.write(path, new ArrayBuffer(0));

    exists = await storage.exists(path);
    if (isSuccess(exists)) expect(exists.value).toBe(true);

    const delRes = await storage.delete(path);
    expect(isSuccess(delRes)).toBe(true);

    exists = await storage.exists(path);
    if (isSuccess(exists)) expect(exists.value).toBe(false);
  });
  
  it('gracefully handles missing OPFS', async () => {
    vi.stubGlobal('navigator', {});
    const storage = new OPFSBlobStorage();
    
    const exists = await storage.exists('test');
    expect(isFailure(exists)).toBe(true);
    if (isFailure(exists)) {
      expect(exists.error.message).toBe('OPFS is not supported in this environment');
    }
  });
});
