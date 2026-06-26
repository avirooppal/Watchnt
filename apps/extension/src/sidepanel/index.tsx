import React from 'react';
import { createRoot } from 'react-dom/client';

const SidePanel = () => {
  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h2>Watchn't Copilot</h2>
      <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', padding: '8px', marginTop: '16px' }}>
        <p>Live meeting context will appear here.</p>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
