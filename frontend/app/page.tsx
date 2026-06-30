'use client';

import { useMicrophone } from '../hooks/useMicrophone';
import { useRecorder } from '../hooks/useRecorder';

export default function Home() {
  const { stream, error, requestPermission } = useMicrophone();
  const { isRecording, startRecording, stopRecording, audioUrl } = useRecorder(stream);

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
              <a 
                href={audioUrl} 
                download="recording.webm"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition mt-4 text-center block"
              >
                Download Audio
              </a>
            )}
          </div>
        )}
        
        {error && <p className="text-red-500 font-medium">Error: {error}</p>}
      </div>
    </div>
  );
}
