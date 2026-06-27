
export interface WatchntEvent {
    id: string;
    timestamp: Date;
    type: string;
    payload: any;
}

export type CoreEventType = 
    | 'AudioCaptured'
    | 'RecordingStarted'
    | 'RecordingStopped'
    | 'TranscriptionStarted'
    | 'TranscriptionCompleted'
    | 'SpeakerDetected'
    | 'SummaryGenerated'
    | 'ActionItemsGenerated'
    | 'MemoryUpdated'
    | 'MeetingCompleted'
    | 'ExportFinished'
    | 'PluginLoaded'
    | 'ProviderChanged';
