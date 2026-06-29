export * from './provider.js';
export * from './providers/youtube.js';
export * from './providers/html5-media.js';
export * from './discovery/DiscoveryEngine.js';
export * from './providers/tab-audio.js';

import { KnowledgeSourceProvider } from './provider.js';
import { YouTubeProvider } from './providers/youtube.js';
import { HTML5MediaProvider } from './providers/html5-media.js';
import { TabAudioProvider } from './providers/tab-audio.js';

export const PROVIDERS: KnowledgeSourceProvider[] = [
  new YouTubeProvider(),
  new HTML5MediaProvider(),
  new TabAudioProvider()
];

/**
 * Returns the highest priority provider capable of handling the current context.
 */
export async function resolveBestProvider(url: string, dom?: Document): Promise<KnowledgeSourceProvider | null> {
  const capableProviders = [];
  for (const provider of PROVIDERS) {
    if (await provider.detect(url, dom)) {
      capableProviders.push(provider);
    }
  }

  if (capableProviders.length === 0) {
    return null;
  }

  capableProviders.sort((a, b) => b.getPriority() - a.getPriority());
  return capableProviders[0];
}
