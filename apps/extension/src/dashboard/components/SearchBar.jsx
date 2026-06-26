import React from 'react';

export function SearchBar({ value, onChange, loading }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search your knowledge..."
          className="input-base"
          style={{
            width: '100%',
            padding: '16px 16px 16px 44px',
            fontSize: '16px',
            background: 'var(--bg-surface)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: '12px'
          }}
        />
        
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        {loading && (
          <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </div>
        )}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        Semantic search — try concepts, not just keywords
      </div>
    </div>
  );
}
