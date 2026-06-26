import React, { useState } from 'react';

export function KnowledgeCard({ card }) {
  const [showInsights, setShowInsights] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Use variables for badge styling instead of hardcoded hex
  const platformConfig = {
    youtube: { label: 'YouTube', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    meet: { label: 'Google Meet', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    podcast: { label: 'Podcast', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    audio: { label: 'Audio', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    default: { label: card.platform || 'Unknown', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' }
  };

  const config = platformConfig[card.platform?.toLowerCase()] || platformConfig.default;

  const formatTime = (sec) => {
    if (!sec) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sourceLink = (card.platform === 'youtube' && card.source_url) 
    ? `${card.source_url}&t=${Math.floor(card.source_start || 0)}` 
    : null;

  return (
    <div className="knowledge-card glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', lineHeight: '1.4', color: 'var(--text-primary)', flex: 1, paddingRight: '12px' }}>
          {card.title}
        </h3>
        {card.score !== undefined && (
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
            {Math.round(card.score * 100)}% Match
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="badge" style={{ color: config.color, background: config.bg, borderColor: 'transparent' }}>
          {config.label}
        </span>
        {card.channel && (
          <span className="badge badge-source">
            {card.channel}
          </span>
        )}
      </div>
      
      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '14px', flexGrow: 1 }}>
        {card.summary}
      </p>
      
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {card.tags.map(tag => (
            <span key={tag} className="badge badge-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
        <div>
          <button 
            onClick={() => setShowInsights(!showInsights)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: '500', width: '100%' }}
          >
            <span style={{ color: 'var(--accent-primary)', transform: showInsights ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span> 
            Key Insights 
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: 'auto' }}>{card.insights?.length || 0}</span>
          </button>
          
          <div style={{ 
            maxHeight: showInsights ? '500px' : '0', 
            overflow: 'hidden', 
            transition: 'max-height 0.3s ease-in-out',
            opacity: showInsights ? 1 : 0
          }}>
            <ul style={{ margin: '12px 0 0 0', paddingLeft: '24px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              {card.insights?.map((ins, i) => <li key={i} style={{ marginBottom: '8px' }}>{ins}</li>)}
            </ul>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

        <div>
          <button 
            onClick={() => setShowActions(!showActions)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: '500', width: '100%' }}
          >
            <span style={{ color: 'var(--warning)', transform: showActions ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span> 
            Actions 
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: 'auto' }}>{card.actions?.length || 0}</span>
          </button>
          
          <div style={{ 
            maxHeight: showActions ? '500px' : '0', 
            overflow: 'hidden', 
            transition: 'max-height 0.3s ease-in-out',
            opacity: showActions ? 1 : 0
          }}>
            <ul style={{ margin: '12px 0 0 0', paddingLeft: '0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', listStyle: 'none' }}>
              {card.actions?.map((act, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--warning)', marginTop: '2px', flexShrink: 0 }}></div>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {formatTime(card.source_start)} → {formatTime(card.source_end)}
        </div>
        
        {sourceLink ? (
          <a href={sourceLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            Jump to source
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        ) : (
          <span style={{ textTransform: 'capitalize' }}>{card.platform} capture</span>
        )}
      </div>
    </div>
  );
}
