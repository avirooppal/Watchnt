import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        // Mark onboarding complete in storage
        chrome.storage.local.set({ onboardingComplete: true }, () => {
          navigate('/');
        });
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-tally-bg flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-10 md:p-14 shadow-2xl border border-black/5">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-12 h-12 rounded-full bg-tally-orange mx-auto mb-6 flex items-center justify-center shadow-lg shadow-tally-orange/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h1 className="text-5xl font-serif font-bold text-tally-text tracking-tight mb-4">Welcome to WatchNT<span className="text-tally-orange">.</span></h1>
          <p className="text-lg text-black/50 font-medium max-w-md mx-auto">
            Let's configure your AI setup to get you started with private, automated meeting intelligence.
          </p>
        </div>

        {/* Step 1: Transcription */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
              Step 1: Audio Transcription
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Provider</label>
                <select 
                  value={config.transcription_provider}
                  onChange={(e) => setConfig({...config, transcription_provider: e.target.value})}
                  className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all appearance-none"
                >
                  <option value="local">Local (Faster-Whisper)</option>
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Model Name</label>
                <input 
                  type="text" 
                  placeholder={config.transcription_provider === 'local' ? 'base' : config.transcription_provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'}
                  value={config.transcription_model}
                  onChange={(e) => setConfig({...config, transcription_model: e.target.value})}
                  className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
                />
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 mt-8 bg-tally-card hover:bg-black text-white rounded-full font-bold text-lg transition-all shadow-xl"
            >
              Next Step &rarr;
            </button>
          </div>
        )}

        {/* Step 2: LLM */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-serif font-bold text-tally-text border-b border-black/5 pb-4">
              Step 2: AI Summarization
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Provider</label>
                <select 
                  value={config.llm_provider}
                  onChange={(e) => setConfig({...config, llm_provider: e.target.value})}
                  className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all appearance-none"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
              
              {config.llm_provider === 'ollama' && (
                <div>
                  <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Ollama Base URL</label>
                  <input 
                    type="text" 
                    value={config.ollama_base_url}
                    onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})}
                    className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
                  />
                </div>
              )}

              {config.llm_provider !== 'ollama' && (
                <div>
                  <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">{config.llm_provider.toUpperCase()} API Key</label>
                  <input 
                    type="password" 
                    value={(config as any)[`${config.llm_provider}_api_key`]}
                    onChange={(e) => setConfig({...config, [`${config.llm_provider}_api_key`]: e.target.value})}
                    className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold tracking-wide uppercase text-black/40 mb-2">Model Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. llama3, gpt-4o, gemini-1.5-pro"
                  value={config.llm_model}
                  onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                  className="w-full p-4 bg-tally-bg border border-black/5 rounded-xl text-tally-text font-bold text-lg focus:outline-none focus:border-tally-orange focus:ring-1 focus:ring-tally-orange transition-all"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 py-4 bg-white border border-black/10 hover:bg-black/5 text-tally-text rounded-full font-bold text-lg transition-all"
              >
                &larr; Back
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-2/3 py-4 bg-tally-orange hover:bg-black text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-tally-orange/20"
              >
                {saving ? 'Completing Setup...' : 'Complete Setup \u2714'}
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
