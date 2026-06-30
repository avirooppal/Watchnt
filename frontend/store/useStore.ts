import { create } from 'zustand';

interface AppState {
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  
  transcript: any[] | null;
  setTranscript: (transcript: any[] | null) => void;
  
  summary: string | null;
  setSummary: (summary: string | null) => void;
  
  actions: string[] | null;
  setActions: (actions: string[] | null) => void;
}

export const useStore = create<AppState>((set) => ({
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  
  transcript: null,
  setTranscript: (transcript) => set({ transcript }),
  
  summary: null,
  setSummary: (summary) => set({ summary }),
  
  actions: null,
  setActions: (actions) => set({ actions }),
}));
