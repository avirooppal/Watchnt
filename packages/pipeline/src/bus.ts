import type { PipelineEvent } from './events.js';

export type Unsubscribe = () => void;
export type EventHandler = (event: PipelineEvent) => void | Promise<void>;

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private wildcardListeners: Set<EventHandler> = new Set();

  public subscribe(eventType: PipelineEvent['type'], handler: EventHandler): Unsubscribe {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  public subscribeAll(handler: EventHandler): Unsubscribe {
    this.wildcardListeners.add(handler);
    return () => {
      this.wildcardListeners.delete(handler);
    };
  }

  public async publish(event: PipelineEvent): Promise<void> {
    const handlers = this.listeners.get(event.type);
    
    const promises: Promise<void>[] = [];
    
    if (handlers) {
      for (const handler of handlers) {
        try {
          const res = handler(event);
          if (res instanceof Promise) promises.push(res);
        } catch (err) {
          promises.push(Promise.reject(err));
        }
      }
    }

    for (const handler of this.wildcardListeners) {
      try {
        const res = handler(event);
        if (res instanceof Promise) promises.push(res);
      } catch (err) {
        promises.push(Promise.reject(err));
      }
    }

    const results = await Promise.allSettled(promises);
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);

    if (errors.length > 0) {
      // In older environments AggregateError might not exist, but ES2021 provides it.
      // We assume a modern browser environment per project spec.
      throw new AggregateError(errors, `Errors occurred while publishing event ${event.type}`);
    }
  }
}
