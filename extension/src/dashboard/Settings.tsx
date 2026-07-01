import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  if (loading) return <div className="p-8 text-black/60 font-medium">Loading settings...</div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-black/10 pb-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-black/5 transition-colors text-black/60"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-4xl font-serif font-bold tracking-tight text-tally-text">Settings<span className="text-tally-orange">.</span></h2>
            <p className="mt-2 text-black/50 font-medium">Configure your AI providers and connections.</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={handleTest}
            disabled={testing}
            className="px-6 py-2.5 bg-white border border-black/10 hover:border-black/30 text-tally-text rounded-full font-semibold transition-all shadow-sm"
          >
            {testing ? 'Testing...' : 'Test Connections'}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-tally-card hover:bg-black text-white rounded-full font-semibold transition-all shadow-lg"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {testResults && (
        <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-xl">
          <h3 className="font-serif text-2xl font-bold text-tally-text mb-6">Connection Health</h3>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(testResults).map(([key, result]: [string, any]) => (
              <div key={key} className="flex items-center gap-4 bg-tally-bg p-4 rounded-xl border border-black/5">
                {result.status === 'ok' ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : result.status === 'warning' ? (
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-base font-bold text-tally-text capitalize">{key}</p>
                  <p className={`text-sm truncate font-medium ${result.status === 'ok' ? 'text-emerald-600/70' : result.status === 'warning' ? 'text-amber-600/70' : 'text-red-600/70'}`}>
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core System */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-black/5 space-y-6">
          <h3 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
            System Endpoints
          </h3>
          <div>
            <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Backend API URL</label>
            <input 
              type="text" 
              value={backendApiUrl}
              onChange={(e) => setBackendApiUrl(e.target.value)}
              className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Local Ollama Base URL</label>
            <input 
              type="text" 
              value={config.ollama_base_url}
              onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})}
              className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
            />
          </div>
        </div>

        {/* Transcription */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-black/5 space-y-6">
          <h3 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
            Audio Transcription
          </h3>
          <div>
            <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Provider</label>
            <select 
              value={config.transcription_provider}
              onChange={(e) => setConfig({...config, transcription_provider: e.target.value})}
              className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all appearance-none"
            >
              <option value="local">Local (Faster-Whisper)</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
            {config.transcription_provider === 'local' && (
              <p className="text-xs font-medium text-black/40 mt-2">Note: Local requires FFmpeg to be installed on your system.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Model Name</label>
            <input 
              type="text" 
              placeholder={config.transcription_provider === 'local' ? 'base' : config.transcription_provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'}
              value={config.transcription_model}
              onChange={(e) => setConfig({...config, transcription_model: e.target.value})}
              className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
            />
          </div>
        </div>

        {/* LLM Generation */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-black/5 space-y-6 md:col-span-2">
          <h3 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
            LLM Generation (Summaries & Actions)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Provider</label>
              <select 
                value={config.llm_provider}
                onChange={(e) => setConfig({...config, llm_provider: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all appearance-none"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Model Name</label>
              <input 
                type="text" 
                placeholder="e.g. llama3, gpt-4o, gemini-1.5-pro"
                value={config.llm_model}
                onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-black/5 space-y-6 md:col-span-2">
          <h3 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
            API Keys (Cloud Providers)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Groq API Key</label>
              <input 
                type="password" 
                value={config.groq_api_key}
                onChange={(e) => setConfig({...config, groq_api_key: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">OpenAI API Key</label>
              <input 
                type="password" 
                value={config.openai_api_key}
                onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Gemini API Key</label>
              <input 
                type="password" 
                value={config.gemini_api_key}
                onChange={(e) => setConfig({...config, gemini_api_key: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">OpenRouter API Key</label>
              <input 
                type="password" 
                value={config.openrouter_api_key}
                onChange={(e) => setConfig({...config, openrouter_api_key: e.target.value})}
                className="w-full p-3 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-medium focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
