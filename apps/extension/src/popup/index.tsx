import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../shared/components/error-boundary';
import { useNetworkState } from '../shared/hooks/use-network';

const Popup = () => {
  const { isOffline } = useNetworkState();
  
  return (
    <div style={{ width: '320px', padding: '16px', fontFamily: 'system-ui' }}>
      <h2 style={{ margin: '0 0 12px 0' }}>Watchn't Copilot</h2>
      {isOffline && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
          You are currently offline. Audio capture will be buffered locally until network is restored.
        </div>
      )}
      <p style={{ fontSize: '14px', color: '#4b5563' }}>Your AI Meeting Companion is ready.</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary fallback={<div>Something went critically wrong in the Popup.</div>}>
    <Popup />
  </ErrorBoundary>
);
