import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState({
    transcription_provider: 'local',
    llm_provider: 'ollama',
    transcription_model: 'base',
    llm_model: 'llama3',
    ollama_base_url: 'http://localhost:11434/api/generate',
    openai_api_key: '',
    groq_api_key: '',
    gemini_api_key: '',
    openrouter_api_key: ''
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 7));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleTest = async () => {
    setTesting(true);
    try {
      const payload: Record<string, string> = {};
      const keyFields = ["openai_api_key", "groq_api_key", "gemini_api_key", "openrouter_api_key"];
      for (const [key, value] of Object.entries(config)) {
        if (keyFields.includes(key) && typeof value === "string" && value.includes("****")) continue;
        payload[key] = value;
      }
      await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await fetch('http://localhost:8000/config/test', { method: 'POST' });
      if (res.ok) {
        showToast('Connection test passed!', 'success');
        nextStep();
      } else {
        showToast('Connection test failed. Please verify provider settings.', 'error');
      }
    } catch {
      showToast('Could not reach backend at http://localhost:8000. Is it running?', 'error');
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
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

      const res = await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        chrome.storage.local.set({ onboardingComplete: true }, () => {
          showToast('Setup complete! Welcome to WatchNT.', 'success');
          navigate('/');
        });
      } else {
        showToast('Failed to save settings to backend.', 'error');
      }
    } catch {
      showToast('Error connecting to backend.', 'error');
    }
    setSaving(false);
  };

  const PROVIDERS = [
    {
      id: 'ollama',
      name: 'Ollama',
      badge: '100% Local & Private',
      description: 'Zero external network transmission. Runs entirely on your own GPU/CPU.',
      defaultModel: 'llama3.2',
      speed: 'Hardware dependent',
    },
    {
      id: 'groq',
      name: 'Groq',
      badge: 'Ultra Fast (< 1s)',
      description: 'LPU inference with instantaneous transcript summarization.',
      defaultModel: 'llama-3.3-70b-versatile',
      speed: '500+ tokens/sec',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      badge: 'High Reasoning',
      description: 'GPT-4o / GPT-4o-mini with deep nuance for complex business calls.',
      defaultModel: 'gpt-4o-mini',
      speed: 'Fast cloud',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      badge: 'Massive Context',
      description: 'Gemini 1.5 Pro / Flash with multi-hour meeting context windows.',
      defaultModel: 'gemini-1.5-flash',
      speed: 'Fast cloud',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      badge: 'Universal BYOK',
      description: 'Access Claude 3.5 Sonnet, DeepSeek, Mistral, and 200+ models via one key.',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      speed: 'Custom',
    },
  ];

  return (
    <div className="min-h-screen bg-signal-ink flex flex-col items-center justify-center p-6 text-text-primary selection:bg-accent-amber/20 font-sans">
      
      {/* Top Breadcrumb Rail */}
      <div className="w-full max-w-xl mb-6 flex items-center justify-between text-xs font-mono text-text-muted">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="WatchNT" className="w-4 h-4 rounded" />
          <span className="font-semibold text-text-primary text-xs">WatchNT Setup</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Step {step} of 7</span>
          <button 
            onClick={() => {
              chrome.storage.local.set({ onboardingComplete: true }, () => navigate('/'));
            }} 
            className="text-text-muted hover:text-text-primary underline ml-3 transition-colors text-xs"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Main Clean Card */}
      <div className="w-full max-w-xl bg-[#1e1e21] border border-border-hairline rounded-lg p-6 sm:p-8 relative overflow-hidden">
        
        {/* Clean Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-0.5 bg-accent-amber transition-all duration-300" 
          style={{ width: `${(step / 7) * 100}%` }} 
        />

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="w-14 h-14 mx-auto flex items-center justify-center">
              <img src="/logo.png" alt="WatchNT" className="w-12 h-12 rounded object-cover" />
            </div>
            
            <div>
              <span className="text-[10px] font-mono uppercase text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded inline-block mb-2">
                Local-First &bull; Private
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
                Welcome to WatchNT
              </h1>
              <p className="text-text-muted mt-2 max-w-md mx-auto text-xs leading-relaxed">
                The open-source AI Meeting Copilot that records, transcribes, and extracts executive intelligence locally on your hardware.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-left py-1">
              <div className="p-3 rounded bg-[#161618] border border-border-hairline">
                <div className="text-accent-amber font-mono text-xs font-semibold mb-1">BYOK</div>
                <div className="text-[11px] text-text-muted">Use Ollama, Groq, or OpenAI keys. No subscriptions.</div>
              </div>
              <div className="p-3 rounded bg-[#161618] border border-border-hairline">
                <div className="text-state-success font-mono text-xs font-semibold mb-1">Private</div>
                <div className="text-[11px] text-text-muted">Audio and notes remain strictly on your local disk.</div>
              </div>
              <div className="p-3 rounded bg-[#161618] border border-border-hairline">
                <div className="text-state-info font-mono text-xs font-semibold mb-1">Seamless</div>
                <div className="text-[11px] text-text-muted">Works in Google Meet, Zoom, and Teams tabs.</div>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={nextStep} className="w-full py-2.5 text-xs font-medium rounded">
                Get Started
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: ARCHITECTURE */}
        {step === 2 && (
          <div className="space-y-6 text-center animate-fade-in">
            <h2 className="text-3xl font-display tracking-tight text-text-primary">How WatchNT Works</h2>
            <p className="text-text-muted text-sm max-w-lg mx-auto leading-relaxed">
              Unlike traditional SaaS bots that join calls as awkward phantom participants, WatchNT runs directly in your browser.
            </p>

            <div className="text-left space-y-3 p-5 rounded-xl bg-signal-surface/80 border border-border-hairline">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">In-Browser Capture</h4>
                  <p className="text-xs text-text-muted mt-0.5">Captures system tab audio and live captions directly from meeting streams without notifying third parties.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Local Faster-Whisper & Ollama</h4>
                  <p className="text-xs text-text-muted mt-0.5">Dispatches captured data to your local FastAPI service running on port 8000 for transcription and summarization.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Executive Intelligence Dossier</h4>
                  <p className="text-xs text-text-muted mt-0.5">Extracts structured action items, key decisions, interactive timeline, and drafts follow-up emails instantly.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3 rounded-xl">Back</Button>
              <Button onClick={nextStep} className="w-2/3 rounded-xl">Next: AI Configuration</Button>
            </div>
          </div>
        )}

        {/* STEP 3: WORKFLOW */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-fade-in">
            <h2 className="text-3xl font-display tracking-tight text-text-primary">Your Meeting Workflow</h2>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline">
                <span className="text-2xl mb-2 block">🎙️</span>
                <h4 className="text-sm font-semibold text-text-primary">During Call</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  The in-meeting HUD displays live recording elapsed time and captions captured count.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline">
                <span className="text-2xl mb-2 block">⚡</span>
                <h4 className="text-sm font-semibold text-text-primary">After Call</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Automatic AI pipeline executes within seconds. Review action items and copy email drafts.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline">
                <span className="text-2xl mb-2 block">📁</span>
                <h4 className="text-sm font-semibold text-text-primary">Folders & Search</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Organize calls into folders (Product, Sales, 1-on-1s) with instant keyword search.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline">
                <span className="text-2xl mb-2 block">💬</span>
                <h4 className="text-sm font-semibold text-text-primary">Ask Copilot</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Chat directly with any meeting transcript: ask questions and clarify commitments.
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3 rounded-xl">Back</Button>
              <Button onClick={nextStep} className="w-2/3 rounded-xl">Choose Provider</Button>
            </div>
          </div>
        )}

        {/* STEP 4: CHOOSE PROVIDER */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-3xl font-display tracking-tight text-text-primary">Choose Your AI Engine</h2>
              <p className="text-xs text-text-muted mt-1">Select the LLM provider to power summarization and action extraction.</p>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {PROVIDERS.map((p) => {
                const isSelected = config.llm_provider === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setConfig({
                        ...config,
                        llm_provider: p.id,
                        llm_model: p.defaultModel
                      });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-accent-amber/10 border-accent-amber shadow-sm' 
                        : 'bg-signal-surface border-border-hairline hover:border-white/20 hover:bg-signal-surface-raised'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-accent-amber text-signal-ink font-bold' : 'bg-signal-surface-raised text-text-muted border border-border-hairline'
                        }`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">{p.description}</p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-accent-amber bg-accent-amber text-signal-ink' : 'border-border-strong'
                      }`}>
                        {isSelected && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3 rounded-xl">Back</Button>
              <Button onClick={nextStep} className="w-2/3 rounded-xl">Configure {PROVIDERS.find(p => p.id === config.llm_provider)?.name}</Button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIGURE PROVIDER */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-3xl font-display tracking-tight text-text-primary">
                Configure {PROVIDERS.find(p => p.id === config.llm_provider)?.name}
              </h2>
              <p className="text-xs text-text-muted mt-1">Provide connection parameters or API credentials.</p>
            </div>

            <div className="space-y-4 bg-signal-surface/60 p-6 rounded-xl border border-border-hairline">
              {config.llm_provider === 'ollama' ? (
                <>
                  <Input 
                    label="Ollama Host URL" 
                    value={config.ollama_base_url}
                    onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})}
                    placeholder="http://localhost:11434/api/generate"
                  />
                  <Input 
                    label="Model Tag (must be pulled in Ollama)" 
                    placeholder="e.g. llama3.2, mistral, phi3"
                    value={config.llm_model}
                    onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                  />
                  <div className="text-[11px] font-mono text-text-muted bg-signal-ink p-3 rounded-lg border border-border-hairline">
                    💡 Tip: In terminal run <code>ollama pull llama3.2</code> to download the recommended model.
                  </div>
                </>
              ) : (
                <>
                  <Input 
                    type="password"
                    label={`${config.llm_provider.toUpperCase()} API Key`}
                    value={(config as any)[`${config.llm_provider}_api_key`]}
                    onChange={(e) => setConfig({...config, [`${config.llm_provider}_api_key`]: e.target.value})}
                    placeholder="sk-..."
                  />
                  <Input 
                    label="Model ID" 
                    placeholder="e.g. gpt-4o-mini, llama-3.3-70b-versatile, gemini-1.5-flash"
                    value={config.llm_model}
                    onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                  />
                  <div className="text-[11px] font-mono text-text-muted bg-signal-ink p-3 rounded-lg border border-border-hairline">
                    🔒 Security: Keys are stored encrypted in your local backend config and never sent to WatchNT servers.
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3 rounded-xl">Back</Button>
              <Button onClick={nextStep} className="w-2/3 rounded-xl">Continue to Verification</Button>
            </div>
          </div>
        )}

        {/* STEP 6: TEST CONNECTION */}
        {step === 6 && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-signal-surface border border-border-strong flex items-center justify-center mx-auto shadow-surface">
              <svg className="w-8 h-8 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-3xl font-display tracking-tight text-text-primary">Verify Engine Connection</h2>
              <p className="text-text-muted text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed">
                We will send a lightweight probe to test your local FastAPI service and the <strong className="text-text-primary">{config.llm_provider}</strong> model.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline text-left text-xs font-mono space-y-2">
              <div className="flex justify-between text-text-muted">
                <span>Backend Endpoint:</span>
                <span className="text-text-primary">http://localhost:8000</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>LLM Provider:</span>
                <span className="text-accent-amber capitalize">{config.llm_provider}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Selected Model:</span>
                <span className="text-text-primary">{config.llm_model}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3 rounded-xl" disabled={testing}>Back</Button>
              <Button onClick={handleTest} isLoading={testing} className="w-2/3 rounded-xl">Test Connection Now</Button>
            </div>
          </div>
        )}

        {/* STEP 7: READY */}
        {step === 7 && (
          <div className="space-y-8 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-state-success/15 border border-state-success/30 flex items-center justify-center mx-auto shadow-glow">
              <svg className="w-10 h-10 text-state-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-4xl font-display tracking-tight text-text-primary font-medium">You're All Set!</h2>
              <p className="text-text-muted text-sm max-w-md mx-auto mt-2 leading-relaxed">
                WatchNT is initialized and ready. Whenever you join a meeting, click the extension icon to begin capturing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-signal-surface/80 border border-border-hairline text-xs text-text-muted flex items-center justify-center gap-3">
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
              <span>Engine Status: <strong>Online & Ready</strong></span>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} isLoading={saving} className="w-full py-3.5 text-sm font-semibold rounded-xl" size="lg">
                Enter Meeting Dashboard
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

