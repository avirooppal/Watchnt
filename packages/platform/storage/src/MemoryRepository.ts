
import { MeetingRepository } from '@watchnt/testing';
import { Meeting } from '@watchnt/meeting';

export class MemoryRepository implements MeetingRepository {
    private meetings = new Map<string, Meeting>();
    private audioStorage = new Map<string, ArrayBuffer>();

    async save(meeting: Meeting): Promise<void> {
        this.meetings.set(meeting.id, JSON.parse(JSON.stringify(meeting)));
    }

    async getById(id: string): Promise<Meeting | null> {
        const m = this.meetings.get(id);
        return m ? JSON.parse(JSON.stringify(m)) : null;
    }

    async list(): Promise<Meeting[]> {
        return Array.from(this.meetings.values()).map(m => JSON.parse(JSON.stringify(m)));
    }

    async saveAudio(meetingId: string, audioData: ArrayBuffer): Promise<string> {
        const ref = `audio_${meetingId}_${Date.now()}`;
        this.audioStorage.set(ref, audioData.slice(0));
        return ref;
    }

    async getAudio(audioRef: string): Promise<ArrayBuffer | null> {
        const buffer = this.audioStorage.get(audioRef);
        return buffer ? buffer.slice(0) : null;
    }
}
