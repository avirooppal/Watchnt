export interface BrowserCapabilities {
  hasOPFS: boolean;
  hasFileSystemAccess: boolean;
  hasWebGPU: boolean;
  hasWorkers: boolean;
  hasServiceWorkers: boolean;
  hasIndexedDB: boolean;
  deviceMemoryGB: number;
  hardwareConcurrency: number;
}

export type DeviceTier = 'high' | 'medium' | 'low';

export interface DeviceRecommendations {
  tier: DeviceTier;
  recommendedModelSize: 'small' | 'base' | 'large';
  canRunWebLLM: boolean;
}

/**
 * Safely checks for browser capabilities without throwing if globals are missing (e.g., in SSR)
 */
export function detectCapabilities(): BrowserCapabilities {
  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

  if (!isBrowser) {
    return {
      hasOPFS: false,
      hasFileSystemAccess: false,
      hasWebGPU: false,
      hasWorkers: false,
      hasServiceWorkers: false,
      hasIndexedDB: false,
      deviceMemoryGB: 4, // Conservative default
      hardwareConcurrency: 2, // Conservative default
    };
  }

  // Check for OPFS
  const hasOPFS = !!(navigator.storage && navigator.storage.getDirectory);

  // Check for File System Access API
  const hasFileSystemAccess = 'showOpenFilePicker' in window;

  // Check for WebGPU
  const hasWebGPU = !!navigator.gpu;

  // Check for Workers
  const hasWorkers = typeof Worker !== 'undefined';

  // Check for Service Workers
  const hasServiceWorkers = 'serviceWorker' in navigator;

  // Check for IndexedDB
  const hasIndexedDB = !!window.indexedDB;

  // @ts-expect-error deviceMemory is not standard in all TS definitions
  const deviceMemoryGB = navigator.deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;

  return {
    hasOPFS,
    hasFileSystemAccess,
    hasWebGPU,
    hasWorkers,
    hasServiceWorkers,
    hasIndexedDB,
    deviceMemoryGB,
    hardwareConcurrency,
  };
}

/**
 * Provides recommendations based on detected capabilities
 */
export function getDeviceRecommendations(caps: BrowserCapabilities): DeviceRecommendations {
  const { deviceMemoryGB, hardwareConcurrency, hasWebGPU } = caps;

  let tier: DeviceTier = 'low';
  if (deviceMemoryGB >= 8 && hardwareConcurrency >= 8 && hasWebGPU) {
    tier = 'high';
  } else if (deviceMemoryGB >= 4 && hardwareConcurrency >= 4) {
    tier = 'medium';
  }

  let recommendedModelSize: 'small' | 'base' | 'large' = 'small';
  if (tier === 'high') {
    recommendedModelSize = 'large';
  } else if (tier === 'medium') {
    recommendedModelSize = 'base';
  }

  // WebLLM essentially requires WebGPU and decent memory
  const canRunWebLLM = hasWebGPU && deviceMemoryGB >= 4;

  return {
    tier,
    recommendedModelSize,
    canRunWebLLM,
  };
}
