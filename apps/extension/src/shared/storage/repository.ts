import { IndexedDBWrapper } from './indexeddb';

export class MeetingRepository {
  private db: IndexedDBWrapper;

  constructor() {
    this.db = new IndexedDBWrapper('WatchntDB', 1);
  }

  async init(): Promise<void> {
    await this.db.init((db, oldVersion, newVersion) => {
      if (!db.objectStoreNames.contains('meetings')) {
        db.createObjectStore('meetings', { keyPath: 'id' });
      }
    });
  }

  async saveMeeting(meeting: any): Promise<void> {
    await this.db.put('meetings', meeting);
  }

  async getMeeting(id: string): Promise<any> {
    return await this.db.get('meetings', id);
  }
}
