
export interface EventBus<T> {
    emit(event: string, payload: T): void;
    on(event: string, handler: (payload: T) => void): void;
    once(event: string, handler: (payload: T) => void): void;
    off(event: string, handler: (payload: T) => void): void;
}
