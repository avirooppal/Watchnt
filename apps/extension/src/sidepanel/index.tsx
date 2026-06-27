import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Onboarding from '../dashboard/Onboarding';
import './styles.css';

const SidePanel = () => {
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has already configured the provider
    chrome.storage.sync.get(['aiProvider'], (result) => {
      if (result.aiProvider) {
        setOnboarded(true);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  }

  if (!onboarded) {
    return (
      <div style={{ padding: '20px', height: '100vh', overflowY: 'auto', background: 'var(--bg-dark)' }}>
        <Onboarding onComplete={() => {
          chrome.storage.sync.get(['aiProvider'], (res) => {
             // ensure it's saved by Onboarding, actually Onboarding needs to save it
             // Let's ensure Onboarding saves it properly or we save it here.
          });
          setOnboarded(true);
        }} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo-glow">W</div>
        <h2 className="title">Watchn't Copilot</h2>
      </div>
      
      <div className="glass-panel">
        <div className="status-indicator">
          <div className="dot"></div>
          Waiting for meeting...
        </div>
        
        <div className="context-area">
          Live meeting context, insights, and actions will appear here dynamically.
        </div>
      </div>

      <button className="floating-action" aria-label="Settings" onClick={() => setOnboarded(false)}>
        ⚙️
      </button>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
