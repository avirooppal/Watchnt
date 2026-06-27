
import { describe, it, expect, beforeEach } from 'vitest';
import { Meeting } from '@watchnt/meeting';

export interface MeetingRepository {
    save(meeting: Meeting): Promise<void>;
    getById(id: string): Promise<Meeting | null>;
    list(): Promise<Meeting[]>;
    saveAudio(meetingId: string, audioData: ArrayBuffer): Promise<string>;
    getAudio(audioRef: string): Promise<ArrayBuffer | null>;
}

export function runStorageContractTests(createRepository: () => MeetingRepository) {
    describe('Storage Contract Tests', () => {
        let repo: MeetingRepository;

        beforeEach(() => {
            repo = createRepository();
        });

        it('should save and retrieve a meeting metadata', async () => {
            const meeting: Meeting = {
                id: 'm-123',
                state: 'Draft',
                metadata: { title: 'Test', startTime: Date.now(), participants: [] },
                speakers: [],
                actionItems: [],
                decisions: [],
                timeline: [],
                memoryRefs: [],
                artifacts: {},
                schemaVersion: 'v1'
            };

            await repo.save(meeting);
            const retrieved = await repo.getById('m-123');
            
            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe('m-123');
            expect(retrieved?.metadata.title).toBe('Test');
        });

        it('should save and retrieve audio binary data', async () => {
            const buffer = new ArrayBuffer(8);
            const view = new Uint8Array(buffer);
            view[0] = 42;

            const audioRef = await repo.saveAudio('m-123', buffer);
            expect(audioRef).toBeTruthy();

            const retrievedBuffer = await repo.getAudio(audioRef);
            expect(retrievedBuffer).not.toBeNull();
            
            const retrievedView = new Uint8Array(retrievedBuffer!);
            expect(retrievedView[0]).toBe(42);
        });
    });
}
