import React, { useEffect, useState } from 'react';
import { startObserver, stopObserver } from './observer';

export const Bot: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);

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


  return null;
};
