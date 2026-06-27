
export interface Meeting {
    id: string;
    title: string;
    startTime: Date;
    endTime?: Date;
    status: MeetingStatus;
}

export type MeetingStatus = 'recording' | 'processing' | 'completed' | 'failed';
