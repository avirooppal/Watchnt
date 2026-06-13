import React, { useState, useEffect } from 'react';
import { getConfig, setConfig } from '../../storage/local.js';
import { checkApiConnection } from '../../storage/api.js';

const DEFAULT_MODELS = {
  anthropic: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  openrouter: 'openrouter/auto',
  ollama: 'llama3.1'
};

export function SetupView() {
  const [config, setConfigState] = useState({});
  const [provider, setProvider] = useState('anthropic');
  const [apiHost, setApiHost] = useState('http://localhost:3001');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [vaultPath, setVaultPath] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getConfig().then(c => {
      setConfigState(c);
      if (c.apiHost) setApiHost(c.apiHost);
      if (c.llmProvider) setProvider(c.llmProvider);
      
      const defaultModel = c.modelName || DEFAULT_MODELS[c.llmProvider || 'anthropic'];
      setModelName(defaultModel);
      if (c.vaultPath) setVaultPath(c.vaultPath);
      
      const p = c.llmProvider || 'anthropic';
      if (p === 'anthropic') setApiKey(c.anthropicKey || '');
      else if (p === 'openai') setApiKey(c.openaiKey || '');
      else if (p === 'gemini') setApiKey(c.geminiKey || '');
      else if (p === 'openrouter') setApiKey(c.openrouterKey || '');
    });
  }, []);

  const handleProviderChange = (e) => {
    const p = e.target.value;
    setProvider(p);
    setModelName(config.modelName || DEFAULT_MODELS[p]);
    
    if (p === 'anthropic') setApiKey(config.anthropicKey || '');
    else if (p === 'openai') setApiKey(config.openaiKey || '');
    else if (p === 'gemini') setApiKey(config.geminiKey || '');
    else if (p === 'openrouter') setApiKey(config.openrouterKey || '');
    else setApiKey('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus('Connecting...');
    
    await setConfig({ apiHost });
    const isConnected = await checkApiConnection();
    
    if (!isConnected) {
      setStatus('Could not connect to API Host. Is docker running?');
      return;
    }

    const newConfig = { 
      llmProvider: provider, 
      modelName: modelName || DEFAULT_MODELS[provider],
      vaultPath: vaultPath.trim() 
    };
    if (provider === 'anthropic') newConfig.anthropicKey = apiKey;
    if (provider === 'openai') newConfig.openaiKey = apiKey;
    if (provider === 'gemini') newConfig.geminiKey = apiKey;
    if (provider === 'openrouter') newConfig.openrouterKey = apiKey;

    await setConfig(newConfig);
    setStatus('Saved successfully!');
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Configuration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Configure your API host and LLM provider settings here.</p>
      </div>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>API Host URL</label>
          <input 
            type="text" 
            value={apiHost}
            onChange={e => setApiHost(e.target.value)}
            className="input-base"
            required 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>LLM Provider</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['anthropic', 'openai', 'gemini', 'openrouter', 'ollama'].map(p => (
              <label key={p} style={{ 
                flex: '1 1 calc(33.33% - 8px)', 
                textAlign: 'center', 
                padding: '12px 4px', 
                background: provider === p ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)', 
                border: `1px solid ${provider === p ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontSize: '14px', 
                fontWeight: provider === p ? '600' : '500',
                color: provider === p ? '#818cf8' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                boxShadow: provider === p ? '0 0 0 1px rgba(99, 102, 241, 0.3)' : 'none'
              }}>
                <input 
                  type="radio" 
                  name="llmProvider" 
                  value={p} 
                  checked={provider === p} 
                  onChange={handleProviderChange} 
                  style={{ display: 'none' }} 
                />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {provider !== 'ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="input-base"
            />
          </div>
        )}

        {provider === 'ollama' && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '16px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p style={{ margin: 0, color: '#c7d2fe', fontSize: '14px', lineHeight: '1.5' }}>
              Make sure your local models are running and Docker is healthy. 
              The backend will pass the Model Name below to your Ollama instance.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>Model Name</label>
          {provider === 'openrouter' ? (
            <select
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="input-base"
              style={{ appearance: 'auto', paddingRight: '32px' }}
            >
              <option value="openrouter/auto">Auto (OpenRouter Auto-Routing)</option>
              <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (Free)</option>
              <option value="google/gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="google/gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
              <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            </select>
          ) : (
            <input 
              type="text" 
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder={DEFAULT_MODELS[provider]}
              className="input-base"
            />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '8px' }}>
          <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>Obsidian Vault Path (Optional)</label>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 4px 0' }}>If provided, Watchn't will auto-sync beautifully formatted Markdown notes directly to this local folder on your computer.</p>
          <input 
            type="text" 
            value={vaultPath}
            onChange={e => setVaultPath(e.target.value)}
            placeholder="e.g. C:\Users\name\Documents\Obsidian\Watchnt"
            className="input-base"
          />
        </div>
        <button 
          type="submit" 
          className="btn-primary"
          style={{ padding: '14px', fontSize: '15px', marginTop: '8px' }}
        >
          Save Configuration
        </button>

        {status && (
          <div style={{ 
            textAlign: 'center', 
            padding: '12px',
            borderRadius: '8px',
            background: status.includes('error') || status.includes('Could not') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: status.includes('error') || status.includes('Could not') ? 'var(--danger)' : 'var(--success)', 
            border: `1px solid ${status.includes('error') || status.includes('Could not') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            fontSize: '14px', 
            fontWeight: '500'
          }}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
