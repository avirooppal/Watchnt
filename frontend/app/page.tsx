'use client';

import { useState } from 'react';
import { useMicrophone } from '../hooks/useMicrophone';
import { useRecorder } from '../hooks/useRecorder';
import { useStore } from '../store/useStore';

export default function Home() {
  const { stream, error, requestPermission } = useMicrophone();
  const { isRecording, startRecording, stopRecording, audioUrl, audioBlob } = useRecorder(stream);

  const transcript = useStore((state) => state.transcript);
  const setTranscript = useStore((state) => state.setTranscript);
  const summary = useStore((state) => state.summary);
  const setSummary = useStore((state) => state.setSummary);
  const actions = useStore((state) => state.actions);
  const setActions = useStore((state) => state.setActions);
  
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    setTranscript(null);
    setSummary(null);
    setActions(null);
    try {
      // 1. Create Meeting
      const meetingRes = await fetch('http://localhost:8000/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Meeting ' + new Date().toLocaleString() })
      });
      const meeting = await meetingRes.json();
      
      // 2. Upload Audio
      const formData = new FormData();
      formData.append('meeting_id', meeting.id);
      formData.append('file', audioBlob, 'audio.webm');
      
      await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });
      
      // 3. Transcribe Audio
      const transcribeRes = await fetch(`http://localhost:8000/transcribe/${meeting.id}`, {
        method: 'POST'
      });
      const transcribeData = await transcribeRes.json();
      setTranscript(transcribeData.segments);
      
      // 4. Generate Summary & Actions (in parallel)
      const [summaryRes, actionsRes] = await Promise.all([
        fetch(`http://localhost:8000/summary/${meeting.id}`, { method: 'POST' }),
        fetch(`http://localhost:8000/actions/${meeting.id}`, { method: 'POST' })
      ]);
      
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary);
      
      const actionsData = await actionsRes.json();
      setActions(actionsData.actions);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Watchn't AI Meeting Copilot</h1>
      
      <div className="flex flex-col items-center gap-4">
        {!stream ? (
          <button 
            onClick={requestPermission}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Request Microphone Permission
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-green-500 font-medium">Microphone permission granted!</p>
            
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Start Recording
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="animate-pulse flex items-center justify-center h-4 w-4 rounded-full bg-red-500"></div>
                <span className="text-red-500 font-bold">Recording...</span>
                
                <button 
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Stop Recording
                </button>
              </div>
            )}

            {audioUrl && !isRecording && (
              <div className="flex gap-4 mt-4">
                <a 
                  href={audioUrl} 
                  download="recording.webm"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center block"
                >
                  Download Audio
                </a>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isUploading ? 'Processing...' : 'Upload & Transcribe'}
                </button>
              </div>
            )}
          </div>
        )}
        
        {error && <p className="text-red-500 font-medium">Error: {error}</p>}
        
        {transcript && (
          <div className="mt-8 p-6 bg-gray-100 rounded-lg w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Transcript</h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {transcript.map((segment, idx) => (
                  <p key={idx} className="text-gray-800">
                    <span className="text-gray-500 text-sm mr-2">
                      [{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]
                    </span>
                    {segment.text}
                  </p>
                ))}
              </div>
            </div>
            
            {summary && (
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Summary</h2>
                  <div className="bg-white p-6 rounded shadow whitespace-pre-wrap text-gray-800">
                    {summary}
                  </div>
                </div>
                
                {actions && actions.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Action Items</h2>
                    <ul className="bg-white p-6 rounded shadow text-gray-800 space-y-2 list-disc pl-10">
                      {actions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
