import React, { useEffect, useState } from 'react';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);

  useEffect(() => {
    // Initial state load
    chrome.storage.local.get(['isRecording', 'pipelineStatus'], (result) => {
      setIsRecording(!!result.isRecording);
      setPipelineStatus((result.pipelineStatus as string) || null);
    });

    // Listen for state changes from background script
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
      className="fixed bottom-6 right-6 w-80 rounded-2xl shadow-2xl border border-white/20 overflow-hidden font-sans backdrop-blur-xl bg-slate-900/90 text-slate-100 transition-all duration-300 hover:shadow-indigo-500/20 hover:border-white/30"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 flex justify-between items-center shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
          </div>
          <h2 className="font-semibold text-sm tracking-wide text-white">WatchNT Copilot</h2>
        </div>
        {isRecording && <span className="flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-pulse"></span>}
      </div>
      
      <div className="p-5 flex flex-col gap-4">
        {isProcessing ? (
          <div className="text-center py-3 text-sm text-indigo-300 font-medium flex flex-col items-center justify-center gap-3 bg-indigo-950/40 rounded-xl border border-indigo-500/20">
            <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(129,140,248,0.5)]"></span>
            <span className="tracking-wide animate-pulse">{formatStatus(pipelineStatus)}</span>
          </div>
        ) : isRecording ? (
          <>
            <div className="text-center py-3 text-sm text-emerald-400 font-medium flex items-center justify-center gap-2.5 bg-emerald-950/30 rounded-xl border border-emerald-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              </span>
              Recording Active
            </div>
            <button 
              onClick={handleStopRecording}
              className="w-full py-2.5 bg-red-500/10 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-all duration-200 text-sm border border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] flex justify-center items-center gap-2"
            >
              <span className="w-2 h-2 rounded-sm bg-red-400"></span> Stop Capturing
            </button>
          </>
        ) : pipelineStatus === 'COMPLETED' ? (
          <div className="text-center py-3 text-sm text-emerald-400 font-medium bg-emerald-950/30 rounded-xl border border-emerald-500/20 flex flex-col items-center gap-1">
            <span className="text-xl">✨</span>
            Ready to view in Dashboard!
          </div>
        ) : (
          <div className="text-center text-sm text-slate-400 py-2">
            Click the <strong className="text-slate-200 font-semibold">WatchNT icon</strong> in your extension bar to start.
          </div>
        )}
        
        <button 
          onClick={handleOpenDashboard}
          className="w-full py-2.5 bg-slate-800 text-slate-200 font-medium rounded-xl hover:bg-slate-700 transition-all duration-200 text-sm border border-slate-700 hover:border-slate-500 shadow-sm mt-1 flex justify-center items-center gap-2"
        >
          Open Dashboard ↗
        </button>
      </div>
    </div>
  );
};
