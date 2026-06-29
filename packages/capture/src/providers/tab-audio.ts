import { KnowledgeSourceProvider, KnowledgeSource } from '../provider.js';

export class TabAudioProvider implements KnowledgeSourceProvider {
  detect(url: string, dom?: Document): boolean {
    // This is the absolute fallback, theoretically it can handle any tab.
    return true; 
  }

  getPriority(): number {
    return 10; // Lowest priority, absolute fallback
  }

  async extract(url: string, dom?: Document): Promise<KnowledgeSource> {
    const title = dom?.title || 'Browser Audio';
    
    // In a real implementation, this would trigger chrome.tabCapture
    return {
      id: crypto.randomUUID(),
      type: 'audio',
      origin: new URL(url).hostname,
      title,
      url,
      extractionMethod: 'tab_audio'
    };
  }
}
