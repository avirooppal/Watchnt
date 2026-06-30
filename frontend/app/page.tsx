'use client';

import { useMicrophone } from '../hooks/useMicrophone';

export default function Home() {
  const { stream, error, requestPermission } = useMicrophone();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Watchn't AI Meeting Copilot</h1>
      
      <div className="flex flex-col items-center gap-4">
        <button 
          onClick={requestPermission}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Request Microphone Permission
        </button>
        
        {stream && <p className="text-green-500 font-medium">Microphone permission granted!</p>}
        {error && <p className="text-red-500 font-medium">Error: {error}</p>}
      </div>
    </div>
  );
}
