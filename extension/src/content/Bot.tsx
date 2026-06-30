import React, { useEffect, useState } from 'react';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Initial state load
    chrome.storage.local.get(['isRecording', 'isUploading'], (result) => {
      setIsRecording(!!result.isRecording);
      setUploading(!!result.isUploading);
    });

    // Listen for state changes from background script
    const listener = (changes: any) => {
      if (changes.isRecording) setIsRecording(changes.isRecording.newValue);
      if (changes.isUploading) setUploading(changes.isUploading.newValue);
    };
    chrome.storage.onChanged.addListener(listener);
    
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleStopRecording = () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  };

  const handleOpenDashboard = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  };

  // Remove the meetingDetected early return so it ALWAYS renders when mounted
  // if (!meetingDetected) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden font-sans"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
        <h2 className="font-bold text-sm tracking-wide">WatchNT Copilot</h2>
        {isRecording && <span className="animate-pulse flex h-2 w-2 rounded-full bg-red-400"></span>}
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {uploading ? (
          <div className="text-center py-2 text-sm text-gray-600 font-medium">
            Generating AI insights...
          </div>
        ) : isRecording ? (
          <>
            <div className="text-center py-1 text-sm text-green-600 font-medium flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Recording Meeting
            </div>
            <button 
              onClick={handleStopRecording}
              className="w-full py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm border border-red-200"
            >
              Stop Capturing
            </button>
          </>
        ) : (
          <>
            <div className="text-center text-sm text-gray-500 pb-1">
              Click the WatchNT extension icon to start recording!
            </div>
          </>
        )}
        
        <button 
          onClick={handleOpenDashboard}
          className="w-full py-2 bg-gray-50 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm border border-gray-200 mt-1"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
};
