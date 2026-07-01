import { useEffect, useState } from 'react';

export default function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDetected, setMeetingDetected] = useState(false);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  useEffect(() => {
    // Check state from storage
    chrome.storage.local.get(['isRecording'], (res: any) => {
      setIsRecording(res.isRecording || false);
    });

    // Check if current tab is a meeting
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const url = tabs[0]?.url || '';
      if (url.includes('meet.google.com') || url.includes('zoom.us') || url.includes('teams.microsoft.com')) {
        setMeetingDetected(true);
      }
      if (tabs[0]?.id) setActiveTabId(tabs[0].id);
    });

    // Listen to messages from background
    const messageListener = (msg: any) => {
      if (msg.type === 'RECORDING_STATE_CHANGED') {
        setIsRecording(msg.payload.isRecording);
      }
      if (msg.type === 'MEETING_DETECTED') {
        setMeetingDetected(true);
      }
    };
    
    // Also listen to storage changes directly
    const storageListener = (changes: any, area: string) => {
      if (area === 'local' && changes.isRecording) {
        setIsRecording(changes.isRecording.newValue || false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    chrome.storage.onChanged.addListener(storageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const handleStart = () => {
    if (!activeTabId) return;
    
    chrome.tabCapture.getMediaStreamId({ targetTabId: activeTabId }, (streamId: string) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        alert('Failed to capture tab: ' + chrome.runtime.lastError.message);
        return;
      }
      chrome.runtime.sendMessage({ 
        type: 'START_RECORDING_WITH_STREAM',
        payload: { streamId }
      });
      setIsRecording(true); // Optimistic UI update
      setTimeout(() => window.close(), 100);
    });
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };

  const handleDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  const handleSettings = () => {
    chrome.runtime.openOptionsPage(); // We can make options page later or just simple toggle
  };

  return (
    <div className="flex flex-col w-[340px] min-h-[420px] bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-indigo-600/30 blur-[60px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-50px] left-[-50px] w-[150px] h-[150px] bg-purple-600/20 blur-[60px] rounded-full pointer-events-none"></div>

      <header className="px-5 py-4 flex justify-between items-center border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">WatchNT AI</h1>
        </div>
        <button onClick={handleSettings} className="text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6 z-10">
        {meetingDetected ? (
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
            </div>
            <span className="text-emerald-400 font-medium text-sm tracking-wide">Meeting Detected</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 mb-2 opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            </div>
            <span className="text-slate-400 font-medium text-sm tracking-wide">No Meeting Found</span>
          </div>
        )}

        <div className="flex flex-col w-full gap-3 mt-auto">
          {!isRecording ? (
            <button 
              onClick={handleStart}
              disabled={!meetingDetected}
              className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg flex justify-center items-center gap-2
                ${meetingDetected ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 hover:shadow-indigo-500/25 border border-white/10' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
            >
              Start AI Capture
            </button>
          ) : (
            <button 
              onClick={handleStop}
              className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl font-semibold text-red-400 transition-all duration-300 flex items-center justify-center gap-2 border border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <span className="w-2 h-2 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
              Stop Capturing
            </button>
          )}
          
          <button 
            onClick={handleDashboard}
            className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl font-medium text-slate-300 hover:text-white transition-all duration-300 flex justify-center items-center gap-2"
          >
            Open Dashboard ↗
          </button>
        </div>
      </main>
      
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-white/5 z-10 bg-slate-950/50">
        Privacy-first AI Meeting Copilot
      </footer>
    </div>
  );
}
