
import { Plugin } from './Plugin';
import { PluginRegistry } from './PluginRegistry';

export class PluginLoader {
    constructor(private registry: PluginRegistry) {}

    async load(plugin: Plugin): Promise<void> {
        this.registry.register(plugin);
        await plugin.initialize({ platform: 'generic' });
    }
    
    async unload(id: string): Promise<void> {
        const plugin = this.registry.get(id);
        if (plugin) {
            await plugin.shutdown();
        }
    }
}
