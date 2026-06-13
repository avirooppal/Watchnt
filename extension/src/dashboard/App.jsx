import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useCards } from './hooks/useCards.js';
import { useSearch } from './hooks/useSearch.js';
import { KnowledgeCard } from './components/KnowledgeCard.jsx';
import { SearchBar } from './components/SearchBar.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { EmptyState } from './components/EmptyState.jsx';
import api from '../storage/api.js';

import { SetupView } from './components/SetupView.jsx';
import { ChatView } from './components/ChatView.jsx';
import { GraphView } from './components/GraphView.jsx';

// Import our new premium styles
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [filters, setFilters] = useState({ type: '', tag: '', lang: '' });
  const [exportOpen, setExportOpen] = useState(false);

  const search = useSearch();
  const cardsObj = useCards(filters);

  const isSearching = search.query.trim().length > 0;
  
  const displayCards = isSearching ? search.results : cardsObj.cards;
  const isLoading = isSearching ? search.loading : cardsObj.loading;
  const hasError = isSearching ? search.error : cardsObj.error;

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'library' || isSearching) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading) {
        cardsObj.loadMore();
      }
    });
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, [isLoading, isSearching, cardsObj, activeTab]);

  const handleExport = async (format) => {
    try {
      const res = await api.get(`/export?format=${format}`);
      let content = res;
      let type = 'application/json';
      let extension = 'json';

      if (format === 'markdown') {
        content = res.markdown;
        type = 'text/markdown';
        extension = 'md';
      } else {
        content = JSON.stringify(res, null, 2);
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watchnt-export.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExportOpen(false);
  };

  return (
    <div className="dashboard-container">
      <header className="header-row">
        <h1 className="logo-text">Watchn't</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          
          <div className="nav-tabs">
            <button 
              onClick={() => setActiveTab('library')}
              className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            >
              Library
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            >
              Settings
            </button>
            <button 
              onClick={() => setActiveTab('graph')}
              className={`nav-tab ${activeTab === 'graph' ? 'active' : ''}`}
            >
              Graph
            </button>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setExportOpen(!exportOpen)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {exportOpen && (
              <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', zIndex: 10, width: '160px', overflow: 'hidden' }}>
                <button onClick={() => handleExport('json')} className="btn-secondary" style={{ width: '100%', textAlign: 'left', borderRadius: '0', border: 'none', borderBottom: '1px solid var(--border-color)' }}>As JSON</button>
                <button onClick={() => handleExport('markdown')} className="btn-secondary" style={{ width: '100%', textAlign: 'left', borderRadius: '0', border: 'none' }}>As Markdown</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {activeTab === 'settings' ? (
        <SetupView />
      ) : activeTab === 'chat' ? (
        <ChatView />
      ) : activeTab === 'graph' ? (
        <GraphView />
      ) : (
        <>
          <SearchBar value={search.query} onChange={search.setQuery} loading={search.loading} />

          {!isSearching && (
            <FilterBar filters={filters} onChange={setFilters} />
          )}

          {hasError && (
            <div style={{ color: 'var(--danger)', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', marginTop: '24px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Error loading cards</div>
              {hasError}
            </div>
          )}

          {!isLoading && !hasError && displayCards.length === 0 && !isSearching && (
            <EmptyState />
          )}

          {!isLoading && !hasError && displayCards.length === 0 && isSearching && (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3>No results found for "{search.query}"</h3>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>Try a different semantic search query.</p>
            </div>
          )}

          <div className="cards-grid">
            {displayCards.map((card, i) => (
              <KnowledgeCard key={card.id || i} card={card} />
            ))}
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          
          {!isSearching && displayCards.length > 0 && <div ref={sentinelRef} style={{ height: '40px' }}></div>}
        </>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
