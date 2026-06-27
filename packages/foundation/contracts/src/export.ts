
export interface ExportConfig {
    format: 'markdown' | 'json' | 'obsidian' | 'notion';
    destination?: string;
    includeAudio: boolean;
}

export interface ExportResult {
    success: boolean;
    path?: string;
    url?: string;
    error?: string;
}
