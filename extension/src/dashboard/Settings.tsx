import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // To reach our backend API from the extension
  const [backendApiUrl, setBackendApiUrl] = useState('http://localhost:8000');
  
  const [config, setConfig] = useState({
    transcription_provider: 'local',
    llm_provider: 'ollama',
    transcription_model: '',
    llm_model: '',
    ollama_base_url: 'http://localhost:11434/api/generate',
    openai_api_key: '',
    groq_api_key: '',
    gemini_api_key: '',
    openrouter_api_key: ''
  });

  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const storedBackend = localStorage.getItem('backendUrl');
    if (storedBackend) {
      setBackendApiUrl(storedBackend);
    }
    
    // Fetch from backend
    const url = storedBackend || 'http://localhost:8000';
    fetch(`${url}/config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load config:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('backendUrl', backendApiUrl);
    try {
      const res = await fetch(`${backendApiUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert('Settings saved successfully.');
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch(`${backendApiUrl}/config/test`, {
        method: 'POST'
      });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      alert('Error testing connections.');
    }
    setTesting(false);
  };

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-slate-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
            <p className="text-sm text-slate-400 mt-1">Configure your AI providers and connections</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            {testing ? 'Testing...' : 'Test Connections'}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/30"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {testResults && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6">
          <h3 className="font-medium text-white mb-3">Connection Health Checks</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(testResults).map(([key, result]: [string, any]) => (
              <div key={key} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                {result.status === 'ok' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : result.status === 'warning' ? (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-200 capitalize">{key}</p>
                  <p className={`text-xs truncate ${result.status === 'ok' ? 'text-emerald-400/70' : result.status === 'warning' ? 'text-amber-400/70' : 'text-red-400/70'}`}>
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core System */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
            System Endpoints
          </h3>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">Backend API URL</label>
            <input 
              type="text" 
              value={backendApiUrl}
              onChange={(e) => setBackendApiUrl(e.target.value)}
              className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">Local Ollama Base URL</label>
            <input 
              type="text" 
              value={config.ollama_base_url}
              onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})}
              className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Transcription */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            Audio Transcription
          </h3>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">Provider</label>
            <select 
              value={config.transcription_provider}
              onChange={(e) => setConfig({...config, transcription_provider: e.target.value})}
              className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="local">Local (Faster-Whisper)</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
            {config.transcription_provider === 'local' && (
              <p className="text-xs text-slate-500 mt-2">Note: Local requires FFmpeg to be installed on your system.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">Model Name</label>
            <input 
              type="text" 
              placeholder={config.transcription_provider === 'local' ? 'base' : config.transcription_provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'}
              value={config.transcription_model}
              onChange={(e) => setConfig({...config, transcription_model: e.target.value})}
              className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* LLM Generation */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl md:col-span-2">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            LLM Generation (Summaries & Actions)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">Provider</label>
              <select 
                value={config.llm_provider}
                onChange={(e) => setConfig({...config, llm_provider: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">Model Name</label>
              <input 
                type="text" 
                placeholder="e.g. llama3, gpt-4o, gemini-1.5-pro"
                value={config.llm_model}
                onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl md:col-span-2">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            API Keys (Cloud Providers)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">Groq API Key</label>
              <input 
                type="password" 
                value={config.groq_api_key}
                onChange={(e) => setConfig({...config, groq_api_key: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">OpenAI API Key</label>
              <input 
                type="password" 
                value={config.openai_api_key}
                onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">Gemini API Key</label>
              <input 
                type="password" 
                value={config.gemini_api_key}
                onChange={(e) => setConfig({...config, gemini_api_key: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">OpenRouter API Key</label>
              <input 
                type="password" 
                value={config.openrouter_api_key}
                onChange={(e) => setConfig({...config, openrouter_api_key: e.target.value})}
                className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
