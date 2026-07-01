import React, { useEffect, useState } from 'react';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'pipelineStatus'], (result) => {
      setIsRecording(!!result.isRecording);
      setPipelineStatus((result.pipelineStatus as string) || null);
    });

    const listener = (changes: any) => {
      if (changes.isRecording) setIsRecording(changes.isRecording.newValue);
      if (changes.pipelineStatus) setPipelineStatus(changes.pipelineStatus.newValue);
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

  const formatStatus = (status: string | null) => {
    if (!status) return "Processing...";
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase()) + "...";
  };

  const isProcessing = pipelineStatus && pipelineStatus !== 'RECORDING' && pipelineStatus !== 'COMPLETED' && pipelineStatus !== 'FAILED';

  return (
    <div 
      className="fixed bottom-6 right-6 w-80 rounded-2xl shadow-xl border border-black/5 overflow-hidden font-sans bg-white text-tally-text transition-all duration-300"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bg-tally-bg px-5 py-4 flex justify-between items-center border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-tally-orange"></div>
          <h2 className="font-bold font-serif text-lg tracking-tight text-tally-text italic">WatchNT</h2>
        </div>
        {isRecording && <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>}
      </div>
      
      <div className="p-6 flex flex-col gap-4">
        {isProcessing ? (
          <div className="text-center py-4 text-sm font-bold text-tally-text flex flex-col items-center justify-center gap-3 bg-black/5 rounded-xl border border-black/5">
            <span className="w-6 h-6 border-2 border-tally-orange border-t-transparent rounded-full animate-spin"></span>
            <span className="tracking-wide animate-pulse uppercase">{formatStatus(pipelineStatus)}</span>
          </div>
        ) : isRecording ? (
          <>
            <div className="text-center py-4 text-sm font-bold text-emerald-700 flex items-center justify-center gap-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 uppercase tracking-wide">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Recording Active
            </div>
            <button 
              onClick={handleStopRecording}
              className="w-full py-3 bg-white text-red-600 font-bold rounded-full hover:bg-black/5 transition-all text-sm border border-black/10 shadow-sm flex justify-center items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Stop Capturing
            </button>
          </>
        ) : pipelineStatus === 'COMPLETED' ? (
          <div className="text-center py-4 text-sm font-bold text-emerald-700 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col items-center gap-1">
            <span className="text-xl mb-1">✨</span>
            Ready to view in Dashboard!
          </div>
        ) : (
          <div className="text-center text-sm text-black/50 py-2 font-medium">
            Click the <strong className="text-black font-bold">WatchNT icon</strong> in your extension bar to start.
          </div>
        )}
        
        <button 
          onClick={handleOpenDashboard}
          className="w-full py-3 bg-transparent text-black/60 font-bold rounded-full hover:bg-black/5 hover:text-black transition-all text-sm mt-1 flex justify-center items-center gap-2"
        >
          Open Dashboard &rarr;
        </button>
      </div>
    </div>
  );
};
