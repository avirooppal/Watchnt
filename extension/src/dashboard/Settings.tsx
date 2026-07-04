import { useState, useEffect } from 'react';

import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Skeleton } from '../components/Skeleton';
import { Select } from '../components/Select';

export default function Settings() {

  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('ai_providers');
  
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

  useEffect(() => {
    const storedBackend = localStorage.getItem('backendUrl');
    if (storedBackend) setBackendApiUrl(storedBackend);
    
    fetch(`${storedBackend || 'http://localhost:8000'}/config`)
      .then(res => res.json())
      .then(data => { setConfig(data); setLoading(false); })
      .catch(() => { showToast('Failed to load config', 'error'); setLoading(false); });
  }, [showToast]);

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
        showToast('Settings saved successfully.', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend.', 'error');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch(`${backendApiUrl}/config/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
      showToast('Connection test completed', 'info');
    } catch (err) {
      showToast('Error testing connections.', 'error');
    }
    setTesting(false);
  };

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'ai_providers', label: 'AI Providers' },
    { id: 'recording', label: 'Recording' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'advanced', label: 'Advanced' }
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="w-64 h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-80px)] overflow-hidden bg-signal-ink text-text-primary">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border-hairline shrink-0 py-8 px-4 flex flex-col gap-2">
        <h2 className="text-xl font-display font-bold tracking-tight mb-4 px-3">Settings</h2>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-signal-surface text-text-primary border border-border-hairline shadow-surface' : 'text-text-muted hover:bg-signal-surface-raised hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-thin">
        <div className="max-w-2xl space-y-12 pb-24">
          
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold tracking-tight">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleTest} isLoading={testing}>Test Connections</Button>
              <Button onClick={handleSave} isLoading={saving}>Save Changes</Button>
            </div>
          </div>

          {testResults && activeTab === 'ai_providers' && (
            <div className="bg-signal-surface border border-border-hairline rounded-lg p-6 space-y-4 shadow-surface animate-fade-in">
              <h4 className="font-semibold">Test Results</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(testResults).map(([key, result]: [string, any]) => (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-md bg-signal-ink border border-border-hairline">
                    {result.status === 'ok' ? (
                      <div className="text-state-success mt-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>
                    ) : (
                      <div className="text-state-danger mt-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></div>
                    )}
                    <div>
                      <p className="text-sm font-semibold capitalize">{key}</p>
                      <p className="text-xs text-text-muted mt-1">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai_providers' && (
             <div className="space-y-10 animate-fade-in">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold">LLM Generation</h4>
                    <p className="text-sm text-text-muted">Used for summaries and action items extraction.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 relative z-50">
                      <label className="text-xs font-medium text-text-muted">Provider</label>
                      <Select 
                        value={config.llm_provider}
                        onChange={(val) => setConfig({...config, llm_provider: val})}
                        options={[
                          { value: 'ollama', label: 'Ollama (Local)' },
                          { value: 'groq', label: 'Groq' },
                          { value: 'openai', label: 'OpenAI' },
                          { value: 'gemini', label: 'Google Gemini' },
                          { value: 'openrouter', label: 'OpenRouter' }
                        ]}
                      />
                    </div>
                    <Input label="Model Name" value={config.llm_model} onChange={(e) => setConfig({...config, llm_model: e.target.value})} />
                  </div>
                </section>

                <hr className="border-border-hairline" />

                <section className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold">API Keys</h4>
                    <p className="text-sm text-text-muted">Configure cloud providers for generation or transcription.</p>
                  </div>
                  <div className="space-y-4">
                    <Input type="password" label="OpenAI API Key" value={config.openai_api_key} onChange={(e) => setConfig({...config, openai_api_key: e.target.value})} />
                    <Input type="password" label="Groq API Key" value={config.groq_api_key} onChange={(e) => setConfig({...config, groq_api_key: e.target.value})} />
                    <Input type="password" label="Gemini API Key" value={config.gemini_api_key} onChange={(e) => setConfig({...config, gemini_api_key: e.target.value})} />
                    <Input type="password" label="OpenRouter API Key" value={config.openrouter_api_key} onChange={(e) => setConfig({...config, openrouter_api_key: e.target.value})} />
                  </div>
                </section>
             </div>
          )}

          {activeTab === 'recording' && (
            <div className="space-y-10 animate-fade-in flex items-center justify-center h-48 border border-dashed border-border-hairline rounded-lg text-text-muted">
              Audio transcription is now handled entirely within the browser via live captions (V2 Architecture). No configuration required!
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-10 animate-fade-in">
               <section className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold">System Endpoints</h4>
                    <p className="text-sm text-text-muted">Core connection URLs.</p>
                  </div>
                  <div className="space-y-4">
                    <Input label="Backend API URL" value={backendApiUrl} onChange={(e) => setBackendApiUrl(e.target.value)} />
                    <Input label="Local Ollama Base URL" value={config.ollama_base_url} onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})} />
                  </div>
               </section>
            </div>
          )}
          
          {(activeTab === 'general' || activeTab === 'appearance') && (
            <div className="flex items-center justify-center h-48 border border-dashed border-border-hairline rounded-lg text-text-muted">
              More options coming in a future update.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
