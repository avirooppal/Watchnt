
import { Database } from './Database';

export class StorageManager {
    constructor(private db: Database) {}

    async initialize(): Promise<void> {
        await this.db.connect();
    }
    
    async save<T>(collection: string, id: string, data: T): Promise<void> {
        const tx = await this.db.beginTransaction();
        try {
            await this.db.execute(`INSERT OR REPLACE INTO ${collection} (id, data) VALUES (?, ?)`, [id, JSON.stringify(data)]);
            await tx.commit();
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    }
    
    async get<T>(collection: string, id: string): Promise<T | null> {
        const result = await this.db.execute(`SELECT data FROM ${collection} WHERE id = ?`, [id]);
        if (result && result.length > 0) {
            return JSON.parse(result[0].data) as T;
        }
        return null;
    }
}
