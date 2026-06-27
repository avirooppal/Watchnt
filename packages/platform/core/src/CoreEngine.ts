
import { RuntimeContext } from './RuntimeContext';

export class CoreEngine {
    constructor(private context: RuntimeContext) {}

    async boot(): Promise<void> {
        // Initialize storage, config, etc. via container
        const logger = this.context.container.resolve<any>('logger');
        if (logger) logger.info('CoreEngine booted');
    }

    async shutdown(): Promise<void> {
        const logger = this.context.container.resolve<any>('logger');
        if (logger) logger.info('CoreEngine shut down');
    }
}
