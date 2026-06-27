
export class ServiceContainer {
    private services = new Map<string, any>();

    register<T>(key: string, service: T) {
        this.services.set(key, service);
    }

    resolve<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) throw new Error(`Service ${key} not found in container`);
        return service;
    }
}
