
import { ServiceContainer } from './ServiceContainer';

export interface RuntimeContext {
    container: ServiceContainer;
    environment: string;
}
