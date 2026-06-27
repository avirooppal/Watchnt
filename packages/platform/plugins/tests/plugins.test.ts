
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../src/PluginRegistry';
import { PluginLoader } from '../src/PluginLoader';
import { Plugin } from '../src/Plugin';

class MockPlugin implements Plugin {
    id = 'test-plugin';
    version = '1.0';
    name = 'Test Plugin';
    type = 'CapturePlugin' as const;
    async initialize() {}
    async shutdown() {}
}

describe('Plugin System', () => {
    it('should register and load a plugin', async () => {
        const registry = new PluginRegistry();
        const loader = new PluginLoader(registry);
        const plugin = new MockPlugin();
        
        await loader.load(plugin);
        expect(registry.get('test-plugin')).toBeDefined();
    });

    it('should prevent duplicate registration', () => {
        const registry = new PluginRegistry();
        const plugin = new MockPlugin();
        registry.register(plugin);
        expect(() => registry.register(plugin)).toThrow('Plugin test-plugin already registered');
    });
});
