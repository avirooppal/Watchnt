import React, { useState } from 'react';

export default function Onboarding({ onComplete }) {
    const [step, setStep] = useState(1);
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleFinish();
    };

    const handleFinish = () => {
        chrome.storage.sync.set({ aiProvider: provider, apiKey }, () => {
            if (onComplete) onComplete();
        });
    };

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', fontFamily: 'Inter, sans-serif', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: '#f3f4f6' }}>
            {step === 1 && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '12px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>🎙️</div>
                    <h2 style={{ marginBottom: '16px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome to Watchn't Copilot</h2>
                    <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>Your local-first, privacy-respecting AI meeting assistant.</p>
                    <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>We process your audio locally. Your transcripts are never used to train models.</p>
                    <button onClick={handleNext} style={btnStyle}>Get Started</button>
                </div>
            )}
            
            {step === 2 && (
                <div>
                    <h2 style={{ marginBottom: '8px' }}>Configure AI Provider 🤖</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '24px' }}>We use BYOK (Bring Your Own Key) so you're always in control.</p>
                    <div style={{ margin: '20px 0', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="radio" value="openai" checked={provider === 'openai'} onChange={(e) => setProvider(e.target.value)} style={{ marginRight: '12px' }} />
                            <span>OpenAI</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="radio" value="gemini" checked={provider === 'gemini'} onChange={(e) => setProvider(e.target.value)} style={{ marginRight: '12px' }} />
                            <span>Google Gemini</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="radio" value="openrouter" checked={provider === 'openrouter'} onChange={(e) => setProvider(e.target.value)} style={{ marginRight: '12px' }} />
                            <span>OpenRouter</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="radio" value="ollama" checked={provider === 'ollama'} onChange={(e) => setProvider(e.target.value)} style={{ marginRight: '12px' }} />
                            <span>Ollama (Local)</span>
                        </label>
                    </div>

                    {(provider === 'openai' || provider === 'gemini' || provider === 'openrouter') && (
                        <input 
                            type="password" 
                            placeholder={provider === 'gemini' ? 'AIza...' : provider === 'openrouter' ? 'sk-or-v1-...' : 'sk-...'} 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            style={inputStyle} 
                        />
                    )}
                    <br />
                    <button onClick={handleNext} style={{ ...btnStyle, width: '100%' }}>Continue</button>
                </div>
            )}

            {step === 3 && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
                    <h2>Microphone Access</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Watchn't needs access to your microphone to transcribe meetings.</p>
                    <button onClick={handleFinish} style={{ ...btnStyle, width: '100%' }}>Grant Access & Finish</button>
                </div>
            )}
        </div>
    );
}

const btnStyle = {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '20px',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
    transition: 'transform 0.2s ease'
};

const inputStyle = {
    padding: '12px 16px',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    fontSize: '16px',
    outline: 'none'
};


