import React, { useEffect, useState, useMemo } from 'react';
import { startObserver, stopObserver } from './observer';

const WaveformRing = ({ state, size = 'lg' }: { state: 'idle' | 'recording' | 'processing', size?: 'sm' | 'lg' }) => {
  const bars = 24;
  const dimensions = size === 'lg' ? 'w-14 h-14' : 'w-5 h-5';
  
  // Use useMemo so the random delays don't jump around on re-renders
  const delays = useMemo(() => Array.from({ length: bars }).map(() => Math.random() * 1), []);

  return (
    <div className={`relative ${dimensions} flex items-center justify-center ${state === 'processing' ? 'animate-spool-sweep' : ''}`}>
       <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
         {Array.from({ length: bars }).map((_, i) => {
           const rotation = (360 / bars) * i;
           const delay = delays[i];
           const isRecording = state === 'recording';
           
           return (
             <g key={i} transform={`rotate(${rotation} 50 50)`}>
               <rect 
                 x="48" 
                 y="15" 
                 width="4" 
                 height="10" 
                 rx="2"
                 className={`transition-colors duration-300 ${
                   state === 'idle' ? 'fill-[#7C8896]' :
                   state === 'recording' ? 'fill-[#4FD8C4] animate-signal-ripple' :
                   'fill-[#F2A93B]'
                 }`}
                 style={{ 
                   animationDelay: isRecording ? `${delay}s` : '0s' 
                 }}
               />
             </g>
           )
         })}
         {state === 'idle' && <circle cx="50" cy="50" r="6" fill="#7C8896" />}
       </svg>
    </div>
  )
};

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'pipelineStatus'], (result) => {
      setIsRecording(!!result.isRecording);
      setPipelineStatus((result.pipelineStatus as string) || null);
    });

    const listener = (changes: any) => {
      if (changes.isRecording) {
        const newIsRecording = changes.isRecording.newValue;
        const oldIsRecording = changes.isRecording.oldValue;
        setIsRecording(newIsRecording);

        if (newIsRecording) {
          startObserver();
        } else if (oldIsRecording && !newIsRecording) {
          const transcriptData = stopObserver();
          uploadTranscript(transcriptData);
        }
      }
      if (changes.pipelineStatus) {
        setPipelineStatus(changes.pipelineStatus.newValue);
        if (changes.pipelineStatus.newValue === 'COMPLETED') {
          setIsExpanded(true);
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = "You have an active recording. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  const uploadTranscript = async (transcript: any[]) => {
    try {
      const createRes = await fetch('http://localhost:8000/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Google Meet - ' + new Date().toLocaleString() })
      });
      if (!createRes.ok) throw new Error('Failed to create meeting');
      
      const meetingData = await createRes.json();
      const meetingId = meetingData.id;

      const formData = new FormData();
      formData.append('meeting_id', meetingId);
      formData.append('transcript_json', JSON.stringify(transcript));
      
      const res = await fetch('http://localhost:8000/upload_transcript', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload transcript');
      
      const data = await res.json();
      chrome.runtime.sendMessage({ type: 'RECORDING_UPLOADED', payload: { meetingId: data.meeting_id } });
    } catch (e) {
      console.error("Failed to upload transcript:", e);
      chrome.runtime.sendMessage({ type: 'RECORDING_UPLOAD_FAILED' });
    }
  };

  const handleStopRecording = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };

  const handleOpenDashboard = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Processing...";
    return status.replace(/_/g, ' ').toUpperCase()
      .replace(/\b\w/g, c => c.toUpperCase()) + "...";
  };

  const isProcessing = pipelineStatus && pipelineStatus !== 'RECORDING' && pipelineStatus !== 'COMPLETED' && pipelineStatus !== 'FAILED';

  const meterDelays = useMemo(() => Array.from({ length: 40 }).map(() => Math.random() * 1), []);

  return (
    <div className="fixed bottom-6 left-6 font-sans transition-all duration-300 ease-in-out z-[2147483647] flex flex-col items-start gap-3">
      {isExpanded ? (
        <div 
          className="w-80 rounded-2xl shadow-surface border overflow-hidden animate-fade-in origin-bottom-left font-sans"
          style={{ backgroundColor: '#131A21', borderColor: 'rgba(236, 238, 240, 0.07)', color: '#ECEEF0' }}
        >
          <div 
            className="px-5 py-4 flex justify-between items-center border-b"
            style={{ backgroundColor: '#0B0F14', borderColor: 'rgba(236, 238, 240, 0.07)' }}
          >
            <div className="flex items-center gap-3">
              <WaveformRing size="sm" state={isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'} />
              <h2 className="font-display font-bold text-lg tracking-tight" style={{ color: '#ECEEF0' }}>WatchNT</h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 transition-colors hover:text-white"
                title="Collapse"
                style={{ color: '#7C8896' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          
          <div className="p-5 flex flex-col gap-4">
            {isProcessing ? (
              <div 
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ backgroundColor: '#0B0F14', borderColor: 'rgba(236, 238, 240, 0.07)' }}
              >
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#F2A93B', borderTopColor: 'transparent' }}></div>
                <div className="font-mono text-[11px] font-bold uppercase tracking-widest animate-pulse" style={{ color: '#F2A93B' }}>
                  {formatStatus(pipelineStatus)}
                </div>
              </div>
            ) : isRecording ? (
              <>
                <div className="rounded-lg p-3 border flex flex-col gap-2" style={{ backgroundColor: '#0B0F14', borderColor: 'rgba(236, 238, 240, 0.07)' }}>
                  <div className="flex items-end justify-between h-8 gap-0.5 overflow-hidden">
                    {meterDelays.map((delay, i) => (
                      <div key={i} className="flex-1 bg-[#4FD8C4] animate-signal-ripple rounded-t-sm" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                  <div className="text-right font-mono text-[10px] uppercase font-bold tracking-widest" style={{ color: '#4FD8C4' }}>
                    Live Audio Signal
                  </div>
                </div>
                <button 
                  onClick={handleStopRecording}
                  className="w-full py-3 font-bold rounded-lg transition-all text-sm border flex justify-center items-center gap-2"
                  style={{ backgroundColor: 'rgba(240, 85, 74, 0.1)', color: '#F0554A', borderColor: '#F0554A' }}
                >
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#F0554A' }}></div> Stop Capturing
                </button>
              </>
            ) : pipelineStatus === 'COMPLETED' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-end gap-1 h-6">
                  <div className="w-2 h-4 bg-[#F2A93B] rounded-sm"></div>
                  <div className="w-2 h-6 bg-[#F2A93B] rounded-sm"></div>
                  <div className="w-2 h-3 bg-[#F2A93B] rounded-sm"></div>
                  <div className="w-2 h-5 bg-[#F2A93B] rounded-sm"></div>
                </div>
                <h3 className="font-display font-bold text-xl text-[#ECEEF0]">Captured.</h3>
              </div>
            ) : (
              <div className="text-center text-sm py-2 font-medium" style={{ color: '#7C8896' }}>
                Click the <strong className="font-bold" style={{ color: '#ECEEF0' }}>WatchNT icon</strong> in your extension bar to start recording.
              </div>
            )}
            
            <button 
              onClick={handleOpenDashboard}
              className="w-full py-3 font-bold rounded-lg transition-all text-sm mt-1 flex justify-center items-center gap-2 border hover:bg-[#1C242D]"
              style={{ backgroundColor: '#0B0F14', color: '#ECEEF0', borderColor: 'rgba(236, 238, 240, 0.07)' }}
            >
              Open Dashboard &rarr;
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          title="Open WatchNT"
          className="rounded-full shadow-glow flex items-center justify-center hover:scale-105 transition-transform group relative border"
          style={{ backgroundColor: '#131A21', borderColor: 'rgba(236, 238, 240, 0.07)' }}
        >
          <WaveformRing state={isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'} />
        </button>
      )}
    </div>
  );
};
