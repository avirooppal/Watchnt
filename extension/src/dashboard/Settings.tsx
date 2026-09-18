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
    openrouter_api_key: '',
    summary_prompt_template: '',
    email_prompt_template: ''
  });

  // Local preferences
  const [generalPrefs, setGeneralPrefs] = useState({
    autoDetectMeetings: true,
    confirmBeforeExit: true,
    defaultLanguage: 'en',
    enableNotifications: true,
  });

  const [recordingPrefs, setRecordingPrefs] = useState({
    autoEnableCaptions: true,
    captureGoogleMeet: true,
    captureZoom: true,
    captureTeams: true,
    showInMeetingHUD: true,
  });

  const [appearancePrefs, setAppearancePrefs] = useState({
    density: 'comfortable',
    themeAccent: 'amber',
  });

  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    setBackendApiUrl(storedBackend);

    // Load local preferences from storage if available
    chrome.storage?.local?.get(['generalPrefs', 'recordingPrefs', 'appearancePrefs'], (res: any) => {
      if (res?.generalPrefs) setGeneralPrefs(res.generalPrefs);
      if (res?.recordingPrefs) setRecordingPrefs(res.recordingPrefs);
      if (res?.appearancePrefs) setAppearancePrefs(res.appearancePrefs);
    });
    
    fetch(`${storedBackend}/config`)
      .then(res => res.json())
      .then(data => { 
        setConfig(data); 
        setLoading(false); 
      })
      .catch(() => { 
        showToast('Failed to load config from backend.', 'error'); 
        setLoading(false); 
      });
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('backendUrl', backendApiUrl);
    chrome.storage?.local?.set({
      generalPrefs,
      recordingPrefs,
      appearancePrefs
    });

    try {
      const payload: Record<string, string> = {};
      const keyFields = [
        "openai_api_key",
        "groq_api_key",
        "gemini_api_key",
        "openrouter_api_key",
      ];

      for (const [key, value] of Object.entries(config)) {
        if (
          keyFields.includes(key) &&
          typeof value === "string" &&
          value.includes("****")
        ) {
          continue;
        }
        payload[key] = value;
      }

      const res = await fetch(`${backendApiUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Settings saved successfully.', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch {
      showToast('Error connecting to backend.', 'error');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const payload: Record<string, string> = {};
      const keyFields = ["openai_api_key", "groq_api_key", "gemini_api_key", "openrouter_api_key"];
      for (const [key, value] of Object.entries(config)) {
        if (keyFields.includes(key) && typeof value === "string" && value.includes("****")) continue;
        payload[key] = value;
      }
      await fetch(`${backendApiUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await fetch(`${backendApiUrl}/config/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
      showToast('Diagnostics completed', 'info');
    } catch {
      showToast('Error testing connections.', 'error');
    }
    setTesting(false);
  };

  const TABS = [
    { id: 'ai_providers', label: 'AI Engine (BYOK)' },
    { id: 'templates', label: 'Prompt Templates' },
    { id: 'recording', label: 'Meeting Capture' },
    { id: 'general', label: 'General Preferences' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'advanced', label: 'Engine & Endpoints' }
  ];

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-40 h-8 rounded-lg" />
          <Skeleton className="w-80 h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex bg-signal-ink text-text-primary">
      
      {/* Sidebar Navigation - Identical to MeetingList layout */}
      <aside className="w-64 border-r border-border-hairline bg-signal-surface/40 p-4 shrink-0 flex flex-col gap-1">
        <div className="px-2 mb-4">
          <h2 className="text-base font-semibold tracking-tight text-white">Settings</h2>
          <p className="text-xs text-text-muted">Configuration & BYOK Engine</p>
        </div>

        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-signal-surface-raised text-white border border-border-hairline shadow-sm' 
                : 'text-text-secondary hover:bg-signal-surface hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-6 sm:px-10 py-8 max-w-4xl overflow-y-auto">
        <div className="space-y-8 pb-32">
          
          {/* Section Header with Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-hairline pb-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                {TABS.find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleTest} isLoading={testing} className="text-xs rounded-lg px-3.5 py-2">
                Test Connection
              </Button>
              <Button onClick={handleSave} isLoading={saving} className="text-xs font-semibold rounded-lg px-4 py-2">
                Save Changes
              </Button>
            </div>
          </div>

          {/* Test Results Banner */}
          {testResults && (
            <div className="glass-panel border border-border-hairline rounded-2xl p-6 space-y-4 shadow-floating animate-fade-in">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold">Diagnostic Results</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(testResults).map(([key, result]: [string, any]) => (
                  <div key={key} className="flex items-start gap-3 p-4 rounded-xl bg-signal-ink border border-border-hairline">
                    {result.status === 'ok' ? (
                      <div className="text-state-success mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    ) : (
                      <div className="text-state-danger mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium capitalize text-text-primary">{key}</p>
                      <p className="text-[11px] font-mono text-text-muted mt-1 leading-relaxed">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: AI PROVIDERS */}
          {activeTab === 'ai_providers' && (
             <div className="space-y-8 animate-fade-in">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-text-primary">Intelligence Engine (LLM)</h4>
                    <p className="text-xs text-text-muted">Choose which provider generates meeting summaries and action items.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 relative z-50">
                      <label className="text-xs font-medium text-text-muted font-mono uppercase text-[10px]">Provider</label>
                      <Select 
                        value={config.llm_provider}
                        onChange={(val) => setConfig({...config, llm_provider: val})}
                        options={[
                          { value: 'ollama', label: 'Ollama (100% Local & Private)' },
                          { value: 'groq', label: 'Groq (Ultra-Fast LPU)' },
                          { value: 'openai', label: 'OpenAI (GPT-4o)' },
                          { value: 'gemini', label: 'Google Gemini (1.5 Flash/Pro)' },
                          { value: 'openrouter', label: 'OpenRouter (Multi-Provider)' }
                        ]}
                      />
                    </div>
                    <Input 
                      label="Model Identifier" 
                      value={config.llm_model} 
                      onChange={(e) => setConfig({...config, llm_model: e.target.value})} 
                      placeholder="e.g. llama3.2, gpt-4o-mini"
                    />
                  </div>
                </section>

                <hr className="border-border-hairline" />

                <section className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-text-primary">Authentication & Endpoints</h4>
                    <p className="text-xs text-text-muted">Credentials are saved locally in SQLite and never transmitted externally.</p>
                  </div>
                  
                  <div className="space-y-4 bg-signal-surface/40 p-6 rounded-2xl border border-border-hairline">
                    {config.llm_provider === 'ollama' && (
                      <Input 
                        label="Local Ollama Base URL" 
                        value={config.ollama_base_url} 
                        onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})} 
                        placeholder="http://localhost:11434/api/generate"
                      />
                    )}
                    {config.llm_provider === 'openai' && (
                      <Input 
                        type="password" 
                        label="OpenAI API Key" 
                        value={config.openai_api_key} 
                        onChange={(e) => setConfig({...config, openai_api_key: e.target.value})} 
                        placeholder="sk-..."
                      />
                    )}
                    {config.llm_provider === 'groq' && (
                      <Input 
                        type="password" 
                        label="Groq API Key" 
                        value={config.groq_api_key} 
                        onChange={(e) => setConfig({...config, groq_api_key: e.target.value})} 
                        placeholder="gsk_..."
                      />
                    )}
                    {config.llm_provider === 'gemini' && (
                      <Input 
                        type="password" 
                        label="Google Gemini API Key" 
                        value={config.gemini_api_key} 
                        onChange={(e) => setConfig({...config, gemini_api_key: e.target.value})} 
                        placeholder="AIzaSy..."
                      />
                    )}
                    {config.llm_provider === 'openrouter' && (
                      <Input 
                        type="password" 
                        label="OpenRouter API Key" 
                        value={config.openrouter_api_key} 
                        onChange={(e) => setConfig({...config, openrouter_api_key: e.target.value})} 
                        placeholder="sk-or-v1-..."
                      />
                    )}
                  </div>
                </section>
             </div>
          )}
          
          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
             <div className="space-y-8 animate-fade-in">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-text-primary">Summary Prompt Directive</h4>
                    <p className="text-xs text-text-muted">Customize the prompt template passed to your LLM. Variable available: <code className="text-accent-amber font-mono">{'{transcript}'}</code></p>
                  </div>
                  <div>
                    <textarea 
                      className="w-full h-36 p-4 bg-signal-surface border border-border-strong rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-amber font-mono leading-relaxed" 
                      value={config.summary_prompt_template} 
                      onChange={(e) => setConfig({...config, summary_prompt_template: e.target.value})} 
                      placeholder="Leave blank to use default production prompt, or customize: Summarize the following meeting: {transcript}"
                    />
                  </div>
                </section>

                <hr className="border-border-hairline" />

                <section className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-text-primary">Follow-up Email Prompt Directive</h4>
                    <p className="text-xs text-text-muted">Variables available: <code className="text-accent-amber font-mono">{'{summary}'}</code>, <code className="text-accent-amber font-mono">{'{actions}'}</code></p>
                  </div>
                  <div>
                    <textarea 
                      className="w-full h-36 p-4 bg-signal-surface border border-border-strong rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-amber font-mono leading-relaxed" 
                      value={config.email_prompt_template} 
                      onChange={(e) => setConfig({...config, email_prompt_template: e.target.value})} 
                      placeholder="Draft a crisp executive email recap based on: {summary} and actions: {actions}"
                    />
                  </div>
                </section>
             </div>
          )}

          {/* TAB 3: RECORDING */}
          {activeTab === 'recording' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="text-base font-semibold text-text-primary">Meeting Platforms & In-Meeting HUD</h4>
                <p className="text-xs text-text-muted">Configure how WatchNT detects and captures live calls.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-xl bg-signal-surface border border-border-hairline cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">Show In-Meeting Floating HUD Pill</span>
                    <span className="text-[11px] text-text-muted">Renders a compact, draggable recording widget inside the meeting tab.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={recordingPrefs.showInMeetingHUD} 
                    onChange={e => setRecordingPrefs({...recordingPrefs, showInMeetingHUD: e.target.checked})}
                    className="w-4 h-4 text-accent-amber rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-signal-surface border border-border-hairline cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">Google Meet Auto-Captions</span>
                    <span className="text-[11px] text-text-muted">Automatically triggers closed captions when recording starts.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={recordingPrefs.autoEnableCaptions} 
                    onChange={e => setRecordingPrefs({...recordingPrefs, autoEnableCaptions: e.target.checked})}
                    className="w-4 h-4 text-accent-amber rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-signal-surface border border-border-hairline cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">Active Platform Listeners</span>
                    <span className="text-[11px] text-text-muted">Monitor meet.google.com, zoom.us, and teams.microsoft.com</span>
                  </div>
                  <span className="text-[10px] font-mono text-state-success font-bold uppercase">All Active</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="text-base font-semibold text-text-primary">Application Preferences</h4>
                <p className="text-xs text-text-muted">Configure default behaviors and meeting safeguards.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-xl bg-signal-surface border border-border-hairline cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">Confirm Before Leaving Active Call</span>
                    <span className="text-[11px] text-text-muted">Warns if you attempt to close a meeting tab while recording is in progress.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={generalPrefs.confirmBeforeExit} 
                    onChange={e => setGeneralPrefs({...generalPrefs, confirmBeforeExit: e.target.checked})}
                    className="w-4 h-4 text-accent-amber rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-signal-surface border border-border-hairline cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">System Notifications</span>
                    <span className="text-[11px] text-text-muted">Display toast alerts when meetings finish transcribing and extracting.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={generalPrefs.enableNotifications} 
                    onChange={e => setGeneralPrefs({...generalPrefs, enableNotifications: e.target.checked})}
                    className="w-4 h-4 text-accent-amber rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="text-base font-semibold text-text-primary">Theme & Density</h4>
                <p className="text-xs text-text-muted">Personalize your meeting library and dossier viewing experience.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-signal-surface border border-border-hairline">
                  <span className="text-xs font-mono uppercase text-text-muted block mb-3 font-bold">Accent Color</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setAppearancePrefs({...appearancePrefs, themeAccent: 'amber'})}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-amber/15 text-accent-amber border border-accent-amber text-xs font-bold"
                    >
                      <span className="w-3 h-3 rounded-full bg-accent-amber" />
                      Executive Amber
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-signal-surface border border-border-hairline">
                  <span className="text-xs font-mono uppercase text-text-muted block mb-3 font-bold">Layout Density</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAppearancePrefs({...appearancePrefs, density: 'comfortable'})}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        appearancePrefs.density === 'comfortable' ? 'bg-signal-surface-raised text-text-primary border border-white/20' : 'text-text-muted'
                      }`}
                    >
                      Comfortable
                    </button>
                    <button 
                      onClick={() => setAppearancePrefs({...appearancePrefs, density: 'compact'})}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        appearancePrefs.density === 'compact' ? 'bg-signal-surface-raised text-text-primary border border-white/20' : 'text-text-muted'
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-fade-in">
               <section className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-text-primary">Engine Endpoints</h4>
                    <p className="text-xs text-text-muted">Points to your local or remote WatchNT FastAPI backend service.</p>
                  </div>
                  <div className="space-y-4 bg-signal-surface/40 p-6 rounded-2xl border border-border-hairline">
                    <Input 
                      label="Backend API Base URL" 
                      value={backendApiUrl} 
                      onChange={(e) => setBackendApiUrl(e.target.value)} 
                    />
                    <div className="text-[11px] font-mono text-text-muted flex items-center justify-between pt-2">
                      <span>Default: <code>http://localhost:8000</code></span>
                      <button 
                        onClick={() => {
                          fetch(`${backendApiUrl}/health`)
                            .then(r => r.ok ? showToast('Endpoint reachable!', 'success') : showToast('Endpoint returned error', 'error'))
                            .catch(() => showToast('Failed to reach endpoint', 'error'));
                        }}
                        className="text-accent-amber hover:underline"
                      >
                        Ping Endpoint
                      </button>
                    </div>
                  </div>
               </section>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

