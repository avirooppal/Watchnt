import { ProviderRegistry } from './ProviderRegistry';
import { AIProvider } from './AIProvider';

export class ProviderFactory {
    private registry: ProviderRegistry;

    constructor(initialKeys?: Record<string, string>) {
        this.registry = new ProviderRegistry(initialKeys);
    }

    /**
     * Set a credential globally for a provider
     */
    setKey(provider: string, key: string) {
        this.registry.setKey(provider, key);
    }

    /**
     * Vends out the AIProvider abstraction wrapper
     */
    getProvider(): AIProvider {
        return this.registry;
    }
}

// Export a singleton instance for default usage
export const defaultProviderFactory = new ProviderFactory();
