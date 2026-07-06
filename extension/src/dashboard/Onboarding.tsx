import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';
import { Select } from '../components/Select';

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

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

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
        showToast('Connection test failed. Please check your details.', 'error');
      }
    } catch (err) {
      showToast('Could not reach backend. Is it running?', 'error');
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
          showToast('Setup complete!', 'success');
          navigate('/');
        });
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend.', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-signal-ink flex flex-col items-center justify-center p-6 animate-fade-in text-text-primary selection:bg-accent-amber/20">
      <div className="w-full max-w-2xl bg-signal-surface border-2 border-border-strong rounded-none p-12 md:p-16 shadow-floating relative">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-accent-amber transition-all duration-500 rounded-none" style={{ width: `${(step / 7) * 100}%` }} />

        {step === 1 && (
          <div className="space-y-8 text-center animate-slide-in-right">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-8">
              <img src="/logo.png" alt="WatchNT Logo" className="w-full h-full rounded-none object-cover shadow-surface grayscale" />
            </div>
            <h1 className="text-4xl font-display tracking-tight text-text-primary">Welcome to WatchNT</h1>
            <p className="text-text-muted mt-2 max-w-md mx-auto">The private, open-source Meeting Intelligence Engine. Bring Your Own Keys (BYOK). 100% Local-First by design.</p>
            <div className="pt-8 space-y-3">
              <Button onClick={nextStep} className="w-full" size="lg">Get Started</Button>
              <button onClick={() => {
                chrome.storage.local.set({ onboardingComplete: true }, () => navigate('/'));
              }} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Skip Onboarding
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-center animate-slide-in-right">
            <h2 className="text-3xl font-display tracking-tight text-text-primary">What is WatchNT?</h2>
            <p className="text-text-muted leading-relaxed max-w-lg mx-auto">
              WatchNT is a Meeting Intelligence Engine that runs securely on your hardware. It reads live captions directly from your browser—no bots joining the call, no vendor lock-in, and your data stays yours.
            </p>
            <div className="pt-8 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3">Back</Button>
              <Button onClick={nextStep} className="w-2/3">Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 text-center animate-slide-in-right">
            <h2 className="text-3xl font-display tracking-tight text-text-primary">How it works</h2>
            <div className="text-left space-y-4 text-sm font-sans text-text-muted bg-signal-ink p-8 rounded-none border border-border-strong shadow-inner">
              <div className="flex gap-3"><span className="text-accent-amber">1.</span> Join a meeting and click the WatchNT extension.</div>
              <div className="flex gap-3"><span className="text-accent-amber">2.</span> WatchNT securely scrapes the live captions.</div>
              <div className="flex gap-3"><span className="text-accent-amber">3.</span> After the meeting, it generates a transcript.</div>
              <div className="flex gap-3"><span className="text-accent-amber">4.</span> Your chosen AI creates a summary and extracts actions.</div>
            </div>
            <div className="pt-8 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3">Back</Button>
              <Button onClick={nextStep} className="w-2/3">Got it</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-slide-in-right">
            <h2 className="text-3xl font-display tracking-tight text-text-primary text-center">Choose AI Provider</h2>
            <div className="space-y-4 relative z-50">
              <label className="block text-sm font-medium text-text-muted">Primary LLM Provider</label>
              <Select 
                value={config.llm_provider}
                onChange={(val) => setConfig({...config, llm_provider: val})}
                options={[
                  { value: 'ollama', label: 'Ollama (100% Local & Private)' },
                  { value: 'groq', label: 'Groq (Ultra Fast)' },
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'openrouter', label: 'OpenRouter' }
                ]}
              />
            </div>
            <div className="pt-8 flex gap-4 relative z-0">
              <Button variant="ghost" onClick={prevStep} className="w-1/3">Back</Button>
              <Button onClick={nextStep} className="w-2/3">Next</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8 animate-slide-in-right">
            <h2 className="text-3xl font-display tracking-tight text-text-primary text-center">Configure Provider</h2>
            <div className="space-y-4">
              {config.llm_provider === 'ollama' ? (
                <>
                  <Input 
                    label="Ollama Base URL" 
                    value={config.ollama_base_url}
                    onChange={(e) => setConfig({...config, ollama_base_url: e.target.value})}
                  />
                  <Input 
                    label="Model Name" 
                    placeholder="e.g. llama3"
                    value={config.llm_model}
                    onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                  />
                </>
              ) : (
                <>
                  <Input 
                    type="password"
                    label={`${config.llm_provider.toUpperCase()} API Key`}
                    value={(config as any)[`${config.llm_provider}_api_key`]}
                    onChange={(e) => setConfig({...config, [`${config.llm_provider}_api_key`]: e.target.value})}
                  />
                  <Input 
                    label="Model Name" 
                    placeholder="e.g. gpt-4o, gemini-1.5-pro"
                    value={config.llm_model}
                    onChange={(e) => setConfig({...config, llm_model: e.target.value})}
                  />
                </>
              )}
            </div>
            <div className="pt-8 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3">Back</Button>
              <Button onClick={nextStep} className="w-2/3">Next</Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 text-center animate-slide-in-right">
            <h2 className="text-3xl font-display tracking-tight text-text-primary">Test Connection</h2>
            <p className="text-text-muted text-sm">
              We'll quickly ping your backend and AI provider to make sure everything is wired up correctly.
            </p>
            <div className="pt-8 flex gap-4">
              <Button variant="ghost" onClick={prevStep} className="w-1/3" disabled={testing}>Back</Button>
              <Button onClick={handleTest} isLoading={testing} className="w-2/3">Test Now</Button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8 text-center animate-slide-in-right">
            <div className="w-20 h-20 rounded-none bg-signal-surface border border-state-success/30 flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-state-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-4xl font-display tracking-tight text-text-primary">Everything Ready</h2>
            <p className="text-text-muted">
              WatchNT is configured. You can tweak more advanced settings in the Settings page later.
            </p>
            <div className="pt-8">
              <Button onClick={handleSave} isLoading={saving} className="w-full" size="lg">Open Dashboard</Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
