import React from 'react';

export function FilterBar({ filters, onChange }) {
  const handleChange = (key, val) => {
    onChange({ ...filters, [key]: val });
  };

  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <select 
          className="input-base"
          style={{ paddingRight: '32px', appearance: 'none', cursor: 'pointer', background: 'var(--bg-surface)' }}
          value={filters.type} 
          onChange={e => handleChange('type', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="tutorial">Tutorial</option>
          <option value="interview">Interview</option>
          <option value="lecture">Lecture</option>
          <option value="talk">Talk</option>
          <option value="podcast">Podcast</option>
          <option value="other">Other</option>
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div style={{ position: 'relative' }}>
        <select 
          className="input-base"
          style={{ paddingRight: '32px', appearance: 'none', cursor: 'pointer', background: 'var(--bg-surface)' }}
          value={filters.lang} 
          onChange={e => handleChange('lang', e.target.value)}
        >
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="pt">Portuguese</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
        <input 
          type="text" 
          className="input-base"
          placeholder="Filter by tag..."
          style={{ width: '100%', paddingLeft: '32px', background: 'var(--bg-surface)' }}
          value={filters.tag}
          onChange={e => handleChange('tag', e.target.value)}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
      </div>
    </div>
  );
}
