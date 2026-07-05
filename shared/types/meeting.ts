

export interface Meeting {
  id: string;
  title: string;
  status: 'RECORDING' | 'TRANSCRIBING' | 'SUMMARIZING' | 'EXTRACTING_ACTIONS' | 'DRAFTING_EMAIL' | 'COMPLETED' | 'FAILED';
  created_at: string;
  folder_id?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}
