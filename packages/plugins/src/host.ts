import type { PluginManifest, PluginMessage } from './manifest.js';
import { RpcMediator } from './rpc.js';
import { Result, success, failure } from '@watchnt/shared';

export class PluginHost {
  private worker?: Worker;
  private mediator: RpcMediator;
  
  constructor(
    public readonly manifest: PluginManifest,
    private readonly scriptContent: string
  ) {
    this.mediator = new RpcMediator(this.manifest.permissions);
  }

  /**
   * Initializes the plugin inside a sandboxed Web Worker.
   */
  public async load(): Promise<Result<void>> {
    try {
      // Create an object URL containing the plugin's code.
      // We prepend a simple SDK shim so the plugin can talk back via postMessage.
      const sdkShim = `
        const __manifest = ${JSON.stringify(this.manifest)};
        
        class WatchNtSDK {
          constructor() {
            this.callbacks = new Map();
            self.addEventListener('message', (e) => this.handleMessage(e));
          }

          handleMessage(e) {
            const msg = e.data;
            if (msg.type === 'response') {
              const cb = this.callbacks.get(msg.id);
              if (cb) {
                this.callbacks.delete(msg.id);
                if (msg.error) cb.reject(new Error(msg.error));
                else cb.resolve(msg.payload);
              }
            } else if (msg.type === 'event') {
              // Handle incoming events from host if needed
            }
          }

          async invoke(method, payload) {
            return new Promise((resolve, reject) => {
              const id = crypto.randomUUID();
              this.callbacks.set(id, { resolve, reject });
              self.postMessage({ id, type: 'request', method, payload });
            });
          }

          // Importer Capability
          async saveContent(data) {
            return this.invoke('storage:saveContent', data);
          }

          // Exporter Capability
          async readNotes(query) {
            return this.invoke('storage:readNotes', query);
          }

          // AI Provider Capability
          async invokeAI(model, prompt) {
            return this.invoke('ai:invoke', { model, prompt });
          }

          // Retrieval Strategy Capability
          async search(query, limit = 5) {
            return this.invoke('retrieval:search', { query, limit });
          }

          // Prompt Template Capability
          async readPrompt(key) {
            return this.invoke('prompt:read', { key });
          }

          // Note Generator Capability
          async generateNote(title, content) {
            return this.invoke('notes:generate', { title, content });
          }
        }

        self.watchnt = new WatchNtSDK();
      `;

      const blob = new Blob([sdkShim + '\n' + this.scriptContent], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      // Listen to RPC requests from the untrusted plugin
      this.worker.onmessage = async (e: MessageEvent<PluginMessage>) => {
        const msg = e.data;
        if (msg.type === 'request') {
          try {
            // Mediator validates permissions and executes the requested host function
            const result = await this.mediator.handleRequest(msg.method, msg.payload);
            this.worker?.postMessage({
              id: msg.id,
              type: 'response',
              payload: result
            } as PluginMessage);
          } catch (err) {
            this.worker?.postMessage({
              id: msg.id,
              type: 'response',
              error: err instanceof Error ? err.message : String(err)
            } as PluginMessage);
          }
        }
      };
      
      this.worker.onerror = (e) => {
        console.error(`[Plugin ${this.manifest.id} Error]:`, e.message);
      };

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public unload() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  /**
   * Helper to invoke a function explicitly ON the plugin (e.g. trigger export)
   */
  public async invokePluginFunction(method: string, payload: any): Promise<void> {
    if (!this.worker) throw new Error('Plugin not loaded');
    const msgId = crypto.randomUUID();
    this.worker.postMessage({
      id: msgId,
      type: 'event',
      method,
      payload
    });
  }
}
