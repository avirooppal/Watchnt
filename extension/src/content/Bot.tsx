import React, { useEffect, useState } from 'react';
import { startObserver, stopObserver } from './observer';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);

  const isRecordingRef = React.useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    chrome.storage.local.get(['isRecording'], (result) => {
      setIsRecording(!!result.isRecording);
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
    };
    chrome.storage.onChanged.addListener(listener);
    
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      // Auto-upload if the bot is unmounted (e.g. meeting ended) while still recording
      if (isRecordingRef.current) {
        console.log("WatchNT: Meeting ended or unmounted while recording. Auto-uploading...");
        const transcriptData = stopObserver();
        uploadTranscript(transcriptData);
        chrome.storage.local.set({ isRecording: false, isUploading: true, pipelineStatus: 'UPLOADING' });
      }
    };
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

  const uploadTranscript = (transcript: any[]) => {
    chrome.runtime.sendMessage({ type: 'PROCESS_TRANSCRIPT', payload: { transcript } });
  };


  return null;
};
