import React, { useEffect, useState, useRef } from 'react';
import { startObserver, stopObserver } from './observer';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Sync recording state with storage
  useEffect(() => {
    chrome.storage.local.get(['isRecording', 'recordingStartTime'], (result: any) => {
      const rec = !!result.isRecording;
      setIsRecording(rec);
      if (rec && result.recordingStartTime) {
        setTimer(Math.floor((Date.now() - Number(result.recordingStartTime)) / 1000));
      }
    });

    const listener = (changes: any) => {
      if (changes.isRecording) {
        const newIsRecording = changes.isRecording.newValue;
        const oldIsRecording = changes.isRecording.oldValue;
        setIsRecording(newIsRecording);

        if (newIsRecording) {
          setTimer(0);
          startObserver();
        } else if (oldIsRecording && !newIsRecording) {
          const transcriptData = stopObserver();
          uploadTranscript(transcriptData);
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      if (isRecordingRef.current) {
        const transcriptData = stopObserver();
        uploadTranscript(transcriptData);
        chrome.storage.local.set({ isRecording: false, isUploading: true, pipelineStatus: 'UPLOADING' });
      }
    };
  }, []);

  // Timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Warn on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = "WatchNT is actively recording this meeting. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  const uploadTranscript = (transcript: any[]) => {
    chrome.runtime.sendMessage({ type: 'PROCESS_TRANSCRIPT', payload: { transcript } });
  };

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 2147483647, // Max z-index to stay above meeting UI
        fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Minimized Pill Mode */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: '#18181c',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '8px',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
          title="Expand WatchNT HUD"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: isRecording ? '#ef4444' : '#10b981',
              boxShadow: isRecording ? '0 0 8px #ef4444' : 'none',
            }}
          />
          <span>{isRecording ? formatTime(timer) : 'WatchNT'}</span>
        </button>
      ) : (
        /* Full HUD Widget */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            background: '#18181c',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '10px',
            color: '#ffffff',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: isRecording ? '#ef4444' : '#10b981',
                boxShadow: isRecording ? '0 0 8px rgba(239,68,68,0.8)' : '0 0 6px rgba(16,185,129,0.6)',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: isRecording ? '#ef4444' : '#d1d5db',
                textTransform: 'uppercase',
              }}
            >
              {isRecording ? 'REC' : 'WATCHNT'}
            </span>
          </div>

          {/* Recording Timer */}
          {isRecording && (
            <>
              <div
                style={{
                  height: '14px',
                  width: '1px',
                  background: 'rgba(255, 255, 255, 0.18)',
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {formatTime(timer)}
              </span>
            </>
          )}

          <div
            style={{
              height: '14px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.18)',
            }}
          />

          {/* Action Button */}
          {isRecording ? (
            <button
              onClick={handleStop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
              }}
              title="Stop Recording and Analyze"
            >
              <span style={{ width: '7px', height: '7px', background: '#ffffff', borderRadius: '1px' }} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#8b5cf6',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
              }}
              title="Start Recording"
            >
              <span style={{ width: '7px', height: '7px', background: '#ffffff', borderRadius: '9999px' }} />
              <span>Record</span>
            </button>
          )}

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Minimize HUD"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

