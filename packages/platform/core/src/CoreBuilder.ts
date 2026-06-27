
import { ServiceContainer } from './ServiceContainer';
import { CoreEngine } from './CoreEngine';
import { RuntimeContext } from './RuntimeContext';

export class CoreBuilder {
    private container = new ServiceContainer();

    withService<T>(key: string, service: T): this {
        this.container.register(key, service);
        return this;
    }

    build(): CoreEngine {
        const context: RuntimeContext = { container: this.container, environment: 'production' };
        return new CoreEngine(context);
    }
}
