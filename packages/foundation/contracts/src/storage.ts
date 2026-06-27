
export interface StorageDriver {
    save<T>(collection: string, id: string, data: T): Promise<void>;
    get<T>(collection: string, id: string): Promise<T | null>;
    delete(collection: string, id: string): Promise<void>;
    query<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]>;
}
