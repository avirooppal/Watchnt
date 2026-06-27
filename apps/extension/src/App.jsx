
import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [state, setState] = useState('IDLE'); // IDLE, RECORDING, PROCESSING, DONE
  
  const handleToggle = () => {
    if (state === 'IDLE') {
      setState('RECORDING');
    } else if (state === 'RECORDING') {
      setState('PROCESSING');
      // Simulate backend pipeline processing
      setTimeout(() => setState('DONE'), 3000);
    } else if (state === 'DONE') {
      setState('IDLE');
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Watchn't AI</h1>
        <div className={`status-badge ${state.toLowerCase()}`}>
          {state === 'IDLE' ? 'Ready' : state}
        </div>
      </div>

      <div className="content">
        {(state === 'IDLE' || state === 'RECORDING' || state === 'PROCESSING') && (
          <>
            <div className="orb-container">
              <div 
                className={`orb ${state === 'RECORDING' ? 'recording' : ''}`} 
                onClick={state !== 'PROCESSING' ? handleToggle : undefined}
                style={{ opacity: state === 'PROCESSING' ? 0.5 : 1, cursor: state === 'PROCESSING' ? 'default' : 'pointer' }}
              >
                <div className="orb-icon">
                  {state === 'IDLE' ? '🎙️' : state === 'RECORDING' ? '⏹️' : '⏳'}
                </div>
              </div>
            </div>
            
            <div className="title">
              {state === 'IDLE' ? 'Capture Meeting' : state === 'RECORDING' ? 'Recording in progress...' : 'Analyzing Intelligence...'}
            </div>
            <div className="subtitle">
              {state === 'IDLE' 
                ? 'Click the orb to start extracting intelligence from this tab.' 
                : state === 'RECORDING' 
                ? 'Capturing audio, transcription, and diarization.'
                : 'Running prompts, generating summary, and vectorizing memory.'}
            </div>
          </>
        )}

        {state === 'DONE' && (
          <div className="results-card">
            <h3>Summary</h3>
            <p>
              The team synced on the V3 architecture rollout. Alice confirmed the pipeline tests pass. Bob agreed to deploy the new Extension UI by Friday.
            </p>
            
            <h3>Action Items</h3>
            <ul className="action-list">
              <li>Alice: Review memory block PR</li>
              <li>Bob: Deploy UI to staging</li>
            </ul>

            <div className="actions">
              <button className="btn btn-secondary" onClick={handleToggle}>New</button>
              <button className="btn btn-primary" onClick={() => window.open('mailto:?subject=Meeting%20Notes&body=Summary...')}>Email</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
