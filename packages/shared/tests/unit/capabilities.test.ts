import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectCapabilities, getDeviceRecommendations } from '../../src/config/capabilities.js';

describe('capabilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects SSR environment (no window)', () => {
    // In vitest node environment, window might be defined if jsdom is used, 
    // but we can stub it out.
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', undefined);

    const caps = detectCapabilities();
    expect(caps.hasOPFS).toBe(false);
    expect(caps.hasWebGPU).toBe(false);
    expect(caps.deviceMemoryGB).toBe(4); // default fallback
  });

  it('detects high tier capabilities', () => {
    const mockNavigator = {
      gpu: {}, // WebGPU present
      deviceMemory: 16,
      hardwareConcurrency: 12,
    };
    
    const mockWindow = {
      Worker: class {},
    };

    vi.stubGlobal('navigator', mockNavigator);
    vi.stubGlobal('window', mockWindow);

    const caps = detectCapabilities();
    expect(caps.hasWebGPU).toBe(true);
    expect(caps.deviceMemoryGB).toBe(16);
    expect(caps.hardwareConcurrency).toBe(12);

    const recommendations = getDeviceRecommendations(caps);
    expect(recommendations.tier).toBe('high');
    expect(recommendations.recommendedModelSize).toBe('large');
    expect(recommendations.canRunWebLLM).toBe(true);
  });

  it('detects low tier capabilities and fallbacks', () => {
    const mockNavigator = {
      // no gpu
      deviceMemory: 2,
      hardwareConcurrency: 2,
    };
    
    const mockWindow = {};

    vi.stubGlobal('navigator', mockNavigator);
    vi.stubGlobal('window', mockWindow);

    const caps = detectCapabilities();
    expect(caps.hasWebGPU).toBe(false);
    
    const recommendations = getDeviceRecommendations(caps);
    expect(recommendations.tier).toBe('low');
    expect(recommendations.recommendedModelSize).toBe('small');
    expect(recommendations.canRunWebLLM).toBe(false);
  });
});
