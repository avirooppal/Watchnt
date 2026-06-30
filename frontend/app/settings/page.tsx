'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [smtpUser, setSmtpUser] = useState('');
  
  useEffect(() => {
    // In a real app, this might fetch from a backend settings endpoint 
    // or rely on local storage.
    const storedBackend = localStorage.getItem('backendUrl');
    if (storedBackend) setBackendUrl(storedBackend);
  }, []);

  const handleSave = () => {
    localStorage.setItem('backendUrl', backendUrl);
    alert('Settings saved locally.');
  };

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto font-sans text-gray-800">
      <div className="mb-6 flex gap-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline">&larr; Dashboard</Link>
        <Link href="/" className="text-blue-600 hover:underline">Home</Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      
      <div className="bg-white p-6 rounded shadow border border-gray-100 space-y-6">
        <div>
          <label className="block font-medium mb-1">Backend API URL</label>
          <input 
            type="text" 
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block font-medium mb-1">Ollama URL</label>
          <input 
            type="text" 
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block font-medium mb-1">SMTP User (Email)</label>
          <input 
            type="text" 
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="For backend server mapping..."
          />
        </div>
        
        <button 
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
