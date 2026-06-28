export type PluginPermission =
  | 'network'
  | 'storage:read'
  | 'storage:write'
  | 'ai:invoke'        // Call the AI provider abstraction
  | 'retrieval:search' // Run a retrieval strategy
  | 'prompt:read'      // Read prompt templates from the registry
  | 'notes:generate';  // Generate / mutate notes

export type PluginCapability =
  | 'importer'
  | 'exporter'
  | 'ai-provider'       // Plugin supplies its own AI backend
  | 'retrieval-strategy' // Plugin supplies a custom retrieval strategy
  | 'prompt-template'   // Plugin supplies prompt templates
  | 'note-generator';   // Plugin can create notes from AI output

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions: PluginPermission[];
  capabilities: PluginCapability[];
  scriptUrl?: string; // Where the script was loaded from, if applicable
}

export interface PluginMessage<T = unknown> {
  id: string;
  type: 'request' | 'response' | 'event';
  method: string;
  payload?: T;
  error?: string;
}
