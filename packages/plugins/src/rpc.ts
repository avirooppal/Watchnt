import type { PluginPermission } from './manifest.js';

type RpcHandler = (payload: any) => Promise<any>;

export class RpcMediator {
  private handlers: Map<string, { handler: RpcHandler; requiredPermission: PluginPermission }> = new Map();

  constructor(private grantedPermissions: PluginPermission[]) {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    this.registerHandler('storage:saveContent', 'storage:write', async (payload) => {
      // Stub: in a real app, this calls ModelFacade.content.create(...)
      console.log('Mock storage:saveContent called with payload:', payload);
      return { success: true, id: 'imported-id-123' };
    });

    this.registerHandler('storage:readNotes', 'storage:read', async (payload) => {
      // Stub: calls ModelFacade.notes.get(...)
      console.log('Mock storage:readNotes called with payload:', payload);
      return { notes: [{ id: 'note-1', text: 'This is a test note' }] };
    });
    
    this.registerHandler('network:fetch', 'network', async (payload) => {
      console.log('Mock network:fetch called for url:', payload.url);
      return { data: 'mocked network response' };
    });

    // AI provider capability — plugin asks the host to run inference via the AI abstraction
    this.registerHandler('ai:invoke', 'ai:invoke', async (payload) => {
      // Stub: in a real app calls ModelRegistry.getActiveProvider().complete(payload)
      console.log('Mock ai:invoke called with model:', payload.model);
      return { result: `[AI mock response to: ${payload.prompt}]` };
    });

    // Retrieval strategy capability — plugin triggers a hybrid / vector search
    this.registerHandler('retrieval:search', 'retrieval:search', async (payload) => {
      // Stub: calls SearchService.searchHybrid(...)
      console.log('Mock retrieval:search called with query:', payload.query);
      return { results: [] };
    });

    // Prompt-template capability — plugin reads a named prompt from the registry
    this.registerHandler('prompt:read', 'prompt:read', async (payload) => {
      // Stub: reads from PromptRegistry
      console.log('Mock prompt:read called for key:', payload.key);
      return { template: `You are a helpful assistant. Context: {{context}}` };
    });

    // Note-generator capability — plugin creates a new note from structured data
    this.registerHandler('notes:generate', 'notes:generate', async (payload) => {
      // Stub: calls NotesService.saveNote(...)
      console.log('Mock notes:generate called with title:', payload.title);
      return { success: true, noteId: `generated-note-${Date.now()}` };
    });
  }

  public registerHandler(method: string, requiredPermission: PluginPermission, handler: RpcHandler) {
    this.handlers.set(method, { handler, requiredPermission });
  }

  public async handleRequest(method: string, payload: any): Promise<any> {
    const route = this.handlers.get(method);
    if (!route) {
      throw new Error(`Unknown RPC method: ${method}`);
    }

    if (!this.grantedPermissions.includes(route.requiredPermission)) {
      throw new Error(`Permission denied: Plugin lacks '${route.requiredPermission}' capability for method '${method}'`);
    }

    return await route.handler(payload);
  }
}
