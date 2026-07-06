

export interface Meeting {
  id: string;
  title: string;
  status: 'RECORDING' | 'TRANSCRIBING' | 'SUMMARIZING' | 'EXTRACTING_ACTIONS' | 'DRAFTING_EMAIL' | 'COMPLETED' | 'FAILED';
  created_at: string;
  folder_id?: string | null;
  duration_minutes?: number | null;
  language?: string | null;
  provider?: string | null;
  model_used?: string | null;
  model_version?: string | null;
  processing_time?: number | null;
  word_count?: number | null;
  speaker_count?: number | null;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}
