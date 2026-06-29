export interface SystemCapabilities {
  hasOPFS: boolean;
  hasWebGPU: boolean;
  hasFileSystemAccess: boolean;
  hasTabCapture: boolean;
  hasOffscreenDocuments: boolean;
  hasMediaRecorder: boolean;
  hasWasmSimd: boolean;
}

export class CapabilityManager {
  private capabilities: SystemCapabilities | null = null;

  async detect(): Promise<SystemCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const isBrowser = typeof window !== 'undefined';
    
    this.capabilities = {
      hasOPFS: isBrowser && 'storage' in navigator && 'getDirectory' in navigator.storage,
      hasWebGPU: isBrowser && 'gpu' in navigator,
      hasFileSystemAccess: isBrowser && 'showSaveFilePicker' in window,
      hasTabCapture: isBrowser && typeof chrome !== 'undefined' && !!chrome.tabCapture,
      hasOffscreenDocuments: isBrowser && typeof chrome !== 'undefined' && !!chrome.offscreen,
      hasMediaRecorder: isBrowser && 'MediaRecorder' in window,
      hasWasmSimd: await this.detectWasmSimd()
    };

    return this.capabilities;
  }

  get(): SystemCapabilities {
    if (!this.capabilities) {
      throw new Error('Capabilities not detected yet. Call detect() first.');
    }
    return this.capabilities;
  }

  private async detectWasmSimd(): Promise<boolean> {
    if (typeof WebAssembly === 'undefined') return false;
    try {
      const bytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
        0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
        0x41, 0x00, 0xfd, 0x0f, 0x0b
      ]);
      return WebAssembly.validate(bytes);
    } catch {
      return false;
    }
  }
}

export const capabilityManager = new CapabilityManager();
