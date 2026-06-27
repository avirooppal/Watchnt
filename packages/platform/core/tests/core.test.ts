
import { describe, it, expect, vi } from 'vitest';
import { CoreBuilder } from '../src/CoreBuilder';
import { ServiceContainer } from '../src/ServiceContainer';

describe('CoreEngine', () => {
    it('should boot and shutdown cleanly using DI', async () => {
        const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
        
        const builder = new CoreBuilder();
        const engine = builder
            .withService('logger', mockLogger)
            .build();
            
        await engine.boot();
        expect(mockLogger.info).toHaveBeenCalledWith('CoreEngine booted');
        
        await engine.shutdown();
        expect(mockLogger.info).toHaveBeenCalledWith('CoreEngine shut down');
    });

    it('ServiceContainer should resolve dependencies', () => {
        const container = new ServiceContainer();
        container.register('test', { value: 42 });
        expect(container.resolve<any>('test').value).toBe(42);
        
        expect(() => container.resolve('missing')).toThrow('Service missing not found in container');
    });
});
