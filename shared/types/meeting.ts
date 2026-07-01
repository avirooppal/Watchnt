import type { MeetingStatus } from './status';

export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  created_at: string;
}
