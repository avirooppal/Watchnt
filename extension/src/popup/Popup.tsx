import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';

export default function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDetected, setMeetingDetected] = useState(false);

  const [timer, setTimer] = useState(0);
  const [pipelineState, setPipelineState] = useState<Record<string, 'pending' | 'active' | 'done' | 'error'>>({});
  const { showToast } = useToast();

  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'recordingStartTime', 'pipelineStatus'], (res: any) => {
      setIsRecording(res.isRecording || false);
      if (res.isRecording && res.recordingStartTime) {
        setTimer(Math.floor((Date.now() - res.recordingStartTime) / 1000));
      }
      if (res.pipelineStatus) {
        const status = res.pipelineStatus;
        const newState: Record<string, 'pending' | 'active' | 'done' | 'error'> = {};
        if (status === 'RECORDING') { newState.recording = 'active'; }
        if (status === 'UPLOADING') { newState.recording = 'done'; newState.uploading = 'active'; }
        if (status === 'TRANSCRIBING') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'active'; }
        if (status === 'EXTRACTING_INTELLIGENCE') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'active'; }
        if (status === 'PERSISTING_MODEL') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'active'; }
        if (status === 'COMPLETED') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'done'; }
        if (status === 'FAILED') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'error'; newState.finalizing = 'error'; }
        setPipelineState(newState);
      }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const url = tabs[0]?.url || '';
      if (url.includes('meet.google.com') || url.includes('zoom.us') || url.includes('teams.microsoft.com')) {
        setMeetingDetected(true);
      }
    });

    const messageListener = (msg: any) => {
      if (msg.type === 'RECORDING_STATE_CHANGED') {
        setIsRecording(msg.payload.isRecording);
        if (msg.payload.isRecording) {
          showToast('Meeting recording started', 'success');
        } else {
          showToast('Recording stopped', 'info');
        }
      }
      if (msg.type === 'MEETING_DETECTED') setMeetingDetected(true);
      if (msg.type === 'PIPELINE_UPDATE') setPipelineState(msg.payload);
    };
    
    const storageListener = (changes: any) => {
      if (changes.isRecording) {
        setIsRecording(changes.isRecording.newValue);
      }
      if (changes.pipelineStatus) {
        // Map backend string status to pipeline state for the UI
        const status = changes.pipelineStatus.newValue;
        const newState: Record<string, 'pending' | 'active' | 'done' | 'error'> = {};
        if (status === 'RECORDING') { newState.recording = 'active'; }
        if (status === 'UPLOADING') { newState.recording = 'done'; newState.uploading = 'active'; }
        if (status === 'TRANSCRIBING') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'active'; }
        if (status === 'EXTRACTING_INTELLIGENCE') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'active'; }
        if (status === 'PERSISTING_MODEL') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'active'; }
        if (status === 'COMPLETED') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'done'; newState.finalizing = 'done'; }
        if (status === 'FAILED') { newState.recording = 'done'; newState.uploading = 'done'; newState.transcribing = 'done'; newState.extracting = 'error'; newState.finalizing = 'error'; }
        setPipelineState(newState);
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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderPipeline = () => {
    const steps = [
      { id: 'recording', label: 'Recording' },
      { id: 'uploading', label: 'Uploading' },
      { id: 'transcribing', label: 'Transcribing' },
      { id: 'extracting', label: 'Extracting Intelligence' },
      { id: 'finalizing', label: 'Finalizing' }
    ];

    if (!isRecording && Object.keys(pipelineState).length === 0) return null;

    return (
      <div className="w-full flex flex-col gap-2 mt-4 px-4 py-3 bg-signal-surface border border-border-hairline rounded-lg">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Current Step</div>
        {steps.map(step => {
          let state = pipelineState[step.id] || (isRecording && step.id === 'recording' ? 'active' : 'pending');
          
          return (
            <div key={step.id} className={`flex items-center gap-3 text-sm font-medium ${state === 'active' ? 'text-text-primary' : state === 'done' ? 'text-state-success' : 'text-text-muted/50'}`}>
              {state === 'done' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              ) : state === 'active' ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-accent-amber animate-ping" />
                </div>
              ) : state === 'error' ? (
                 <svg className="w-4 h-4 text-state-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="5" strokeWidth={2} /></svg>
              )}
              {step.label}
            </div>
          );
        })}
        
        <button 
          onClick={handleCancelPipeline}
          className="mt-3 w-full py-1.5 rounded-none border border-state-danger/30 text-state-danger text-[10px] font-mono font-bold tracking-widest uppercase hover:bg-state-danger hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div className="w-[340px] bg-signal-ink text-text-primary flex flex-col font-sans select-none overflow-hidden h-[540px]">
      <header className="px-6 py-5 border-b-2 border-border-strong flex items-center justify-between bg-signal-ink">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="WatchNT" className="w-5 h-5 rounded-none object-cover grayscale" />
          <h1 className="text-sm font-display tracking-widest uppercase font-semibold">WatchNT</h1>
        </div>
        {meetingDetected ? (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-state-success">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Meet Detected
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted/50" />
            No Meeting
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full overflow-hidden">
        {isRecording ? (
          <div className="flex flex-col items-center w-full animate-fade-in">
            <div className="flex items-center gap-3 mb-4 text-state-danger font-mono tracking-widest text-[10px] uppercase">
              <div className="w-2.5 h-2.5 rounded-none bg-state-danger shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" />
              Recording
            </div>
            <div className="text-5xl font-mono font-medium tracking-tight mb-8 text-text-primary">
              {formatTime(timer)}
            </div>
            <div className="flex items-center gap-[3px] h-6 mb-8 w-full justify-center opacity-80">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 bg-accent-amber rounded-none animate-waveform" style={{ animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <button 
              onClick={handleStop}
              className="flex items-center gap-3 px-6 py-2.5 rounded-none border border-state-danger/50 text-state-danger text-[10px] font-mono font-bold tracking-widest uppercase hover:bg-state-danger hover:text-white transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse hover:animate-none"
            >
              <div className="w-2.5 h-2.5 bg-current rounded-none" />
              Stop Recording
            </button>
          </div>
        ) : !Object.keys(pipelineState).length ? (
          <div className="flex flex-col items-center text-center px-4 w-full h-full justify-center opacity-70">
            <svg className="w-10 h-10 mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <p className="text-sm font-medium mb-1">Ready to capture.</p>
            <p className="text-xs text-text-muted">Join a Google Meet and press start below.</p>
          </div>
        ) : null}

        {renderPipeline()}
      </main>
      
      <footer className="p-6 border-t-2 border-border-strong flex flex-col gap-3 bg-signal-ink shrink-0">
        {!isRecording && (
          <button 
            onClick={handleStart}
            disabled={!meetingDetected}
            className={`w-full py-3 rounded-none font-sans font-semibold text-sm transition-all focus:outline-none focus:ring-1 focus:ring-accent-amber ${
              meetingDetected 
                ? 'bg-accent-amber text-signal-ink hover:bg-accent-amber-dim shadow-button' 
                : 'bg-signal-surface text-text-muted cursor-not-allowed border border-border-strong'
            }`}
          >
            START RECORDING
          </button>
        )}
        <button 
          onClick={handleDashboard}
          className="w-full py-2 rounded-none font-mono text-[10px] uppercase tracking-widest bg-transparent hover:bg-signal-surface text-text-muted hover:text-text-primary transition-colors focus:outline-none"
        >
          Open Dashboard
        </button>
      </footer>
    </div>
  );
}
