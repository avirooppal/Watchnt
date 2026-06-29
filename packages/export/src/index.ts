import type { KnowledgeAsset, CaptureSession, ContentId, EntityObject, GraphEdgeObject } from '@watchnt/shared';

export interface ExportDestination {
  name: string;
  type: 'markdown' | 'json' | 'pdf' | 'csv' | 'custom';
  export(data: ExportData): Promise<boolean>;
}

export interface ExportData {
  session: CaptureSession;
  assets: KnowledgeAsset[];
  entities: EntityObject[];
  relationships: GraphEdgeObject[];
}

export class ExportEngine {
  private destinations: ExportDestination[] = [];

  registerDestination(destination: ExportDestination) {
    this.destinations.push(destination);
  }

  async exportSession(data: ExportData, destinationNames?: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const destination of this.destinations) {
      if (destinationNames && !destinationNames.includes(destination.name)) {
        continue;
      }
      try {
        const success = await destination.export(data);
        results[destination.name] = success;
      } catch (e) {
        console.error(`Export failed for destination ${destination.name}:`, e);
        results[destination.name] = false;
      }
    }

    return results;
  }
}

// Basic Markdown / Obsidian Exporter
export class MarkdownExportDestination implements ExportDestination {
  name = 'obsidian';
  type = 'markdown' as const;

  constructor(private outputDir?: string) {}

  async export(data: ExportData): Promise<boolean> {
    // Generate Markdown with frontmatter
    let md = `---\n`;
    md += `title: "${data.session.title.replace(/"/g, '\\"')}"\n`;
    md += `source: ${data.session.sourceUrl || data.session.sourceType}\n`;
    md += `date: ${new Date(data.session.startedAt).toISOString()}\n`;
    md += `tags: [watchnt, ${data.session.sourceType}]\n`;
    md += `---\n\n`;

    md += `# ${data.session.title}\n\n`;

    // Add Assets (Summary, Action Items, etc)
    const summary = data.assets.find(a => a.type === 'text' && a.metadata?.subtype === 'summary');
    if (summary) {
      md += `## Summary\n\n${summary.data}\n\n`;
    }

    // Add entities as Wikilinks
    if (data.entities.length > 0) {
      md += `## Entities\n\n`;
      data.entities.forEach(e => {
        md += `- [[${e.name}]] (${e.type})\n`;
      });
      md += `\n`;
    }

    // If running in browser with File System Access API
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window && this.outputDir) {
      // In a real implementation we'd use the OPFS or File System Access API to write.
      // For now, this is just scaffolding.
      console.log('Would export to:', this.outputDir, md);
    }
    
    return true;
  }
}
