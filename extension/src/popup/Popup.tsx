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
    <div className="flex flex-col w-[320px] min-h-[400px] bg-gray-50 text-gray-800 font-sans">
      <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">WatchNT AI</h1>
        <button onClick={handleSettings} className="text-gray-500 hover:text-gray-700">⚙️</button>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {meetingDetected ? (
          <div className="text-green-600 font-medium px-4 py-2 bg-green-50 rounded-full text-sm">
            ✓ Meeting Detected
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No meeting detected</div>
        )}

        <div className="flex flex-col w-full gap-3">
          {!isRecording ? (
            <button 
              onClick={handleStart}
              disabled={!meetingDetected}
              className={`w-full py-3 rounded font-medium text-white transition-colors
                ${meetingDetected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              Start Capturing
            </button>
          ) : (
            <button 
              onClick={handleStop}
              className="w-full py-3 bg-red-600 hover:bg-red-700 rounded font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Stop Capturing
            </button>
          )}
          
          <button 
            onClick={handleDashboard}
            className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 rounded font-medium text-gray-700 transition-colors"
          >
            Open Dashboard
          </button>
        </div>
      </main>
      
      <footer className="p-3 text-center text-xs text-gray-400">
        Privacy-first AI Meeting Copilot
      </footer>
    </div>
  );
}
