
import { Plugin } from './Plugin';

export class PluginRegistry {
    private plugins = new Map<string, Plugin>();

    register(plugin: Plugin) {
        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} already registered`);
        }
        this.plugins.set(plugin.id, plugin);
    }

    get(id: string): Plugin | undefined {
        return this.plugins.get(id);
    }
    
    getAll(): Plugin[] {
        return Array.from(this.plugins.values());
    }
}
