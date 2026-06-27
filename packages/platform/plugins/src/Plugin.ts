
export interface PluginContext {
    platform: string;
}

export interface Plugin {
    id: string;
    version: string;
    name: string;
    type: 'CapturePlugin' | 'MeetingPlatformPlugin' | 'ExportPlugin' | 'ProviderPlugin';
    initialize(context: PluginContext): Promise<void>;
    shutdown(): Promise<void>;
}
