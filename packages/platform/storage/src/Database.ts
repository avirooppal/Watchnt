
export interface Transaction {
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

export interface Database {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    beginTransaction(): Promise<Transaction>;
    execute(query: string, params?: any[]): Promise<any>;
}
