import React from 'react';

export function EmptyState() {
  return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '600px', margin: '40px auto' }}>
      <div style={{ background: 'var(--bg-surface-elevated)', padding: '20px', borderRadius: '50%', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      </div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', margin: '0 0 12px 0' }}>No knowledge captured yet</h2>
      <p style={{ fontSize: '15px', margin: 0, lineHeight: '1.6', color: 'var(--text-secondary)' }}>
        Open a YouTube video, start a Google Meet call, or capture audio from any podcast. The knowledge will automatically appear here.
      </p>
    </div>
  );
}
