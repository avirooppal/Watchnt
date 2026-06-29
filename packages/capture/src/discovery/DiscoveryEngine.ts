import type { KnowledgeSourceType } from '@watchnt/shared';
import { PROVIDERS, resolveBestProvider, type KnowledgeSourceProvider } from '../index.js';

export interface DiscoveryMetadata {
  title: string;
  url: string;
  type: KnowledgeSourceType | 'other';
  availableAssets: string[]; // e.g. ['transcript', 'audio', 'metadata']
  suggestedProvider: string;
}

export class DiscoveryEngine {
  /**
   * Sniffs the active tab for available media, transcripts, and metadata.
   * This should be called from the background script after requesting activeTab permission.
   */
  async sniffTab(tabId: number, url: string): Promise<DiscoveryMetadata | null> {
    // 1. Identify which provider is best suited for this URL based on URL only first
    // Note: To be fully accurate, we would need DOM access, which we inject below.
    
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      // Fallback if scripting is unavailable (e.g. not in extension background worker context)
      const provider = await resolveBestProvider(url);
      return {
        title: 'Unknown Page',
        url,
        type: 'other',
        availableAssets: [],
        suggestedProvider: provider ? provider.constructor.name : 'none'
      };
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const title = document.title;
          const metaTags = Array.from(document.querySelectorAll('meta'));
          const metadata: Record<string, string> = {};
          metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) metadata[name] = content;
          });
          
          // Simple heuristic for available assets
          const assets: string[] = [];
          if (document.querySelector('video')) assets.push('video');
          if (document.querySelector('audio')) assets.push('audio');
          if (window.location.hostname.includes('youtube.com')) assets.push('transcript'); // rough guess
          
          // We can also let the providers detect within the injected script if needed,
          // but for now we extract DOM info and pass back.
          
          return { title, metadata, assets, html: document.documentElement.outerHTML.substring(0, 5000) };
        }
      });

      const extraction = results[0]?.result;
      if (extraction) {
        // Now that we have some pseudo-DOM, we can re-evaluate the best provider
        // A full implementation would serialize a virtual DOM or pass specific metadata.
        const provider = await resolveBestProvider(url);
        
        let type: KnowledgeSourceType | 'other' = 'article';
        if (url.includes('youtube.com')) type = 'youtube';
        else if (extraction.assets.includes('video')) type = 'meeting'; // or video
        else if (extraction.assets.includes('audio')) type = 'podcast'; // or audio

        return {
          title: extraction.title,
          url,
          type,
          availableAssets: extraction.assets,
          suggestedProvider: provider ? provider.constructor.name : 'TabAudioProvider'
        };
      }
    } catch (e) {
      console.error('Failed to sniff tab:', e);
    }

    return null;
  }
}
