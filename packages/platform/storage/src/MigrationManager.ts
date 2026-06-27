
export interface Migration {
    version: number;
    up(): Promise<void>;
    down(): Promise<void>;
}

export class MigrationManager {
    constructor(private migrations: Migration[]) {}
    async migrateTo(targetVersion: number): Promise<void> {
        // migration runner
    }
}
