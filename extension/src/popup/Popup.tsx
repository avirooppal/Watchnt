import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';

export default function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDetected, setMeetingDetected] = useState(false);
  const [platformName, setPlatformName] = useState<string>('Google Meet');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(0);
  const [pipelineState, setPipelineState] = useState<Record<string, 'pending' | 'active' | 'done' | 'error'>>({});
  const { showToast } = useToast();

  // Check backend health
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
        const res = await fetch(`${storedBackend}/health`, { signal: AbortSignal.timeout(2500) });
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'recordingStartTime', 'pipelineStatus', 'meetingDetected'], (res: any) => {
      setIsRecording(res.isRecording || false);
      if (res.meetingDetected) setMeetingDetected(true);
      if (res.isRecording && res.recordingStartTime) {
        setTimer(Math.floor((Date.now() - res.recordingStartTime) / 1000));
      }
      if (res.pipelineStatus) {
        mapStatusToPipeline(res.pipelineStatus);
      }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const url = tabs[0]?.url || '';
      if (url.includes('meet.google.com')) {
        setMeetingDetected(true);
        setPlatformName('Google Meet');
      } else if (url.includes('zoom.us')) {
        setMeetingDetected(true);
        setPlatformName('Zoom');
      } else if (url.includes('teams.microsoft.com')) {
        setMeetingDetected(true);
        setPlatformName('MS Teams');
      }
    });

    const mapStatusToPipeline = (status: string) => {
      const newState: Record<string, 'pending' | 'active' | 'done' | 'error'> = {};
      if (status === 'RECORDING') { newState.recording = 'active'; }
      if (status === 'UPLOADING') { newState.recording = 'done'; newState.uploading = 'active'; }
      if (status === 'TRANSCRIBING') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'active'; }
      if (status === 'EXTRACTING_INTELLIGENCE' || status === 'SUMMARIZING' || status === 'EXTRACTING_ACTIONS') {
        newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'active';
      }
      if (status === 'PERSISTING_MODEL' || status === 'DRAFTING_EMAIL') {
        newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'active';
      }
      if (status === 'COMPLETED') {
        newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'done';
      }
      if (status === 'FAILED') {
        newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'error'; newState.finalizing = 'error';
      }
      setPipelineState(newState);
    };

    const messageListener = (msg: any) => {
      if (msg.type === 'RECORDING_STATE_CHANGED') {
        setIsRecording(msg.payload.isRecording);
        if (msg.payload.isRecording) {
          showToast('Recording started', 'success');
        } else {
          showToast('Recording stopped', 'info');
        }
      }
      if (msg.type === 'MEETING_DETECTED') {
        setMeetingDetected(true);
        if (msg.payload?.platform) setPlatformName(msg.payload.platform);
      }
      if (msg.type === 'PIPELINE_UPDATE') setPipelineState(msg.payload);
    };
    
    const storageListener = (changes: any) => {
      if (changes.isRecording) {
        setIsRecording(changes.isRecording.newValue);
      }
      if (changes.meetingDetected) {
        setMeetingDetected(changes.meetingDetected.newValue);
      }
      if (changes.pipelineStatus) {
        mapStatusToPipeline(changes.pipelineStatus.newValue);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    chrome.storage.onChanged.addListener(storageListener);
    
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.onChanged.removeListener(storageListener);
      if (interval) clearInterval(interval);
    };
  }, [isRecording, showToast]);

  const handleStart = () => {
    chrome.runtime.sendMessage({ type: 'START_RECORDING_WITH_STREAM' });
    setIsRecording(true);
    setTimer(0);
    chrome.storage.local.set({ recordingStartTime: Date.now() });
  };

  const handleStop = () => {
    setIsRecording(false);
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };
  
  const handleCancelPipeline = () => {
    chrome.storage.local.remove(['pipelineStatus', 'isUploading']);
    setPipelineState({});
  };

  const handleDashboard = () => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  const handleSettings = () => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html#/settings') });

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderPipeline = () => {
    const steps = [
      { id: 'recording', label: 'Audio & Captions' },
      { id: 'uploading', label: 'Ingestion' },
      { id: 'transcribing', label: 'Diarization & STT' },
      { id: 'extracting', label: 'Intelligence Extraction' },
      { id: 'finalizing', label: 'Executive Dossier' }
    ];

    if (!isRecording && Object.keys(pipelineState).length === 0) return null;

    return (
      <div className="w-full flex flex-col gap-2.5 mt-2 px-4 py-3 bg-signal-surface/80 backdrop-blur-md border border-border-hairline rounded-xl shadow-surface">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold">Pipeline Status</span>
          <span className="text-[10px] font-mono text-accent-amber">
            {pipelineState.finalizing === 'done' ? 'Ready' : 'Processing'}
          </span>
        </div>
        {steps.map(step => {
          const state = pipelineState[step.id] || (isRecording && step.id === 'recording' ? 'active' : 'pending');
          
          return (
            <div key={step.id} className={`flex items-center gap-3 text-xs font-medium transition-all ${
              state === 'active' ? 'text-text-primary font-semibold' : 
              state === 'done' ? 'text-state-success' : 
              state === 'error' ? 'text-state-danger' : 'text-text-muted/40'
            }`}>
              {state === 'done' ? (
                <div className="w-4 h-4 rounded-full bg-state-success/15 flex items-center justify-center text-state-success">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
              ) : state === 'active' ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-ping" />
                </div>
              ) : state === 'error' ? (
                <div className="w-4 h-4 rounded-full bg-state-danger/15 flex items-center justify-center text-state-danger">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
              ) : (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
                </div>
              )}
              <span className="flex-1">{step.label}</span>
            </div>
          );
        })}
        
        <div className="flex gap-2 mt-2 pt-2 border-t border-border-hairline">
          <button 
            onClick={handleCancelPipeline}
            className="flex-1 py-1 rounded-md border border-border-strong text-text-muted text-[10px] font-mono uppercase tracking-wider hover:bg-signal-surface-raised hover:text-text-primary transition-all"
          >
            Clear
          </button>
          <button 
            onClick={handleDashboard}
            className="flex-1 py-1 rounded-md bg-accent-amber/15 border border-accent-amber/30 text-accent-amber text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-accent-amber hover:text-signal-ink transition-all"
          >
            Open Dossier
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[360px] bg-signal-ink text-text-primary flex flex-col font-sans select-none overflow-hidden h-[510px] border border-border-hairline relative">
      {/* Header */}
      <header className="px-5 py-3.5 border-b border-border-hairline flex items-center justify-between bg-signal-surface">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src="/logo.png" alt="WatchNT" className="w-6 h-6 rounded-md object-cover" />
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-signal-ink ${
              backendOnline ? 'bg-state-success' : backendOnline === false ? 'bg-state-danger' : 'bg-text-muted'
            }`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-sm font-bold text-white">WatchNT</h1>
            <span className="text-[11px] text-text-muted">copilot</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {meetingDetected ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {platformName}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted px-2.5 py-1 rounded-md bg-signal-surface-raised border border-border-hairline">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
              Idle
            </div>
          )}
          <button 
            onClick={handleSettings} 
            className="p-1.5 text-text-muted hover:text-white hover:bg-signal-surface-raised rounded-md transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-5 w-full overflow-y-auto">
        {isRecording ? (
          <div className="flex flex-col items-center w-full my-auto">
            <div className="flex items-center gap-2 mb-3 text-state-danger font-mono text-xs font-bold px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Recording In Progress
            </div>
            
            <div className="text-4xl font-mono font-bold tracking-tight my-4 text-white text-center">
              {formatTime(timer)}
            </div>

            <p className="text-xs text-text-secondary mb-5 text-center">
              Capturing audio and diarized transcript
            </p>

            <button 
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-state-danger hover:bg-red-600 text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-sm" />
              Stop & Analyze
            </button>
          </div>
        ) : !Object.keys(pipelineState).length ? (
          <div className="flex flex-col items-center text-center px-2 w-full my-auto">
            <div className="w-12 h-12 rounded-xl bg-signal-surface border border-border-hairline flex items-center justify-center mb-3 text-accent-amber">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-base font-bold mb-1.5 text-white">
              {meetingDetected ? `${platformName} Ready` : 'Ready to Capture'}
            </h2>
            <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed mb-5">
              {meetingDetected 
                ? 'Click below to start local transcription and intelligence extraction.'
                : 'Join a Google Meet, Zoom, or Microsoft Teams call to record.'}
            </p>

            <div className="text-xs text-text-secondary bg-signal-surface px-3 py-1.5 rounded-md border border-border-hairline">
              Local First &bull; Private &bull; Open Source
            </div>
          </div>
        ) : null}

        {renderPipeline()}
      </main>
      
      {/* Footer */}
      <footer className="p-3.5 border-t border-border-hairline flex flex-col gap-2.5 bg-signal-surface shrink-0">
        {!isRecording && (
          <button 
            onClick={handleStart}
            disabled={!meetingDetected}
            className={`w-full py-2.5 rounded-lg font-sans text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              meetingDetected 
                ? 'bg-accent-amber text-white hover:bg-accent-amber-dim shadow-sm' 
                : 'bg-signal-surface-raised text-text-muted/50 cursor-not-allowed border border-border-hairline'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {meetingDetected ? 'Start Recording' : 'Waiting for Meeting Tab'}
          </button>
        )}
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDashboard}
            className="flex-1 py-2 rounded-md bg-signal-surface-raised border border-border-hairline hover:border-white/20 text-text-secondary hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            Notes & Library
          </button>

          <button 
            onClick={handleSettings}
            className="flex-1 py-2 rounded-md bg-signal-surface-raised border border-border-hairline hover:border-white/20 text-text-secondary hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            Settings
          </button>
        </div>
      </footer>
    </div>
  );
}

