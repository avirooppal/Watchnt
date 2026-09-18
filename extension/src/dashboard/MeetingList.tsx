// extension/src/dashboard/MeetingList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  duration_minutes?: number;
  status: string;
  folder_id?: string | null;
  provider?: string;
  metrics?: {
    action_items?: number;
    decisions?: number;
    speakers?: number;
  };
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const { showToast } = useToast();

  // Search, Filters & View Options
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'PROCESSING' | 'FAILED'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Folder modal / inline rename
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  const fetchMeetings = () => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    fetch(`${storedBackend}/meetings`)
      .then(res => res.json())
      .then(data => {
        setMeetings(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const fetchFolders = () => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    fetch(`${storedBackend}/folders`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFolders(data);
      })
      .catch(console.error);
  };

  const fetchInsights = () => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    fetch(`${storedBackend}/insights`)
      .then(res => res.json())
      .then(data => setInsights(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMeetings();
    fetchFolders();
    fetchInsights();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/meeting/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMeetings(m => m.filter(meeting => meeting.id !== id));
        showToast('Meeting deleted', 'info');
      }
    } catch {
      showToast('Failed to delete meeting', 'error');
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this folder? Meetings inside will be moved back to All Meetings.")) return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/folder/${id}`, { method: 'DELETE' });
      setFolders(f => f.filter(folder => folder.id !== id));
      if (activeFolderId === id) setActiveFolderId(null);
      fetchMeetings();
      showToast('Folder deleted', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders(f => [...f, folder]);
        setNewFolderName('');
        setIsCreatingFolder(false);
        showToast('Folder created', 'success');
      }
    } catch {
      showToast('Failed to create folder', 'error');
    }
  };

  const startRename = (e: React.MouseEvent, meeting: Meeting) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(meeting.id);
    setEditTitle(meeting.title);
    setEditFolderId(meeting.folder_id || null);
  };

  const handleRename = async (e: React.KeyboardEvent | React.MouseEvent, id: string) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, folder_id: editFolderId })
      });
      setMeetings(m => m.map(meeting => meeting.id === id ? { ...meeting, title: editTitle, folder_id: editFolderId } : meeting));
      setEditingId(null);
      showToast('Meeting updated', 'success');
    } catch {
      showToast('Failed to update meeting', 'error');
    }
  };

  const handleCreateSampleMeeting = async () => {
    setIsGeneratingDemo(true);
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const createRes = await fetch(`${storedBackend}/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Product Strategy & Architecture Review' })
      });
      if (!createRes.ok) throw new Error('Failed to create sample meeting');
      const meeting = await createRes.json();

      const sampleTranscript = [
        { speaker: "Alex", text: "Welcome everyone. Today we are reviewing the WatchNT local architecture and roadmap.", timestamp: "00:01" },
        { speaker: "Sarah", text: "I looked over the privacy model. Running Faster-Whisper and Ollama locally completely resolves our enterprise security compliance.", timestamp: "00:15" },
        { speaker: "Alex", text: "Agreed. Let's make sure the Chromium extension HUD is ready for Google Meet and Teams by next Tuesday.", timestamp: "00:45" },
        { speaker: "Sarah", text: "I will take ownership of the extension UX and audio pipeline benchmarks.", timestamp: "01:10" },
        { speaker: "Alex", text: "Decision confirmed. We are launching v0.2.0 as fully open-source with BYOK support.", timestamp: "01:30" }
      ];

      const formData = new FormData();
      formData.append('meeting_id', meeting.id);
      formData.append('transcript_json', JSON.stringify(sampleTranscript));

      await fetch(`${storedBackend}/upload_transcript`, {
        method: 'POST',
        body: formData
      });

      showToast('Sample meeting created! Processing intelligence...', 'success');
      fetchMeetings();
      fetchInsights();
    } catch {
      showToast('Failed to create sample meeting. Ensure backend is running.', 'error');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Ready
          </span>
        );
      case 'FAILED': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Failed
          </span>
        );
      case 'RECORDING': 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Recording
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            {status}
          </span>
        );
    }
  };

  const filteredAndSortedMeetings = useMemo(() => {
    return meetings
      .filter(m => activeFolderId ? m.folder_id === activeFolderId : true)
      .filter(m => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'COMPLETED') return m.status === 'COMPLETED';
        if (statusFilter === 'FAILED') return m.status === 'FAILED';
        if (statusFilter === 'PROCESSING') return m.status !== 'COMPLETED' && m.status !== 'FAILED';
        return true;
      })
      .filter(m => {
        const query = search.toLowerCase();
        return (
          m.title?.toLowerCase().includes(query) || 
          m.status?.toLowerCase().includes(query) ||
          m.provider?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return a.title.localeCompare(b.title);
      });
  }, [meetings, search, sortBy, activeFolderId, statusFilter]);

  const totalActionsCount = insights?.total_action_items ?? insights?.total_actions ?? 0;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full bg-signal-ink">
      
      {/* Sidebar (Obsidian File Tree Style - Readable & Scaled) */}
      <aside className="w-64 border-r border-border-hairline bg-[#141416] shrink-0 hidden md:flex flex-col py-6 px-4">
        <div className="mb-5">
          <div className="px-2 mb-2 text-xs uppercase font-mono tracking-wider text-text-muted font-bold">
            Vault Notes
          </div>
          <button 
            onClick={() => setActiveFolderId(null)}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg font-sans text-sm font-semibold transition-all flex items-center justify-between ${
              !activeFolderId 
                ? 'bg-accent-amber text-white shadow-sm' 
                : 'text-text-secondary hover:bg-signal-surface-raised hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>All Meetings</span>
            </div>
            <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${!activeFolderId ? 'bg-black/20 text-white font-bold' : 'text-text-muted bg-signal-surface'}`}>
              {meetings.length}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs uppercase font-mono tracking-wider text-text-muted font-bold">
              Folders
            </span>
            <button 
              onClick={() => setIsCreatingFolder(true)} 
              className="p-1 rounded text-text-muted hover:text-accent-amber hover:bg-signal-surface-raised transition-colors" 
              title="New Folder"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            {folders.map(folder => {
              const count = meetings.filter(m => m.folder_id === folder.id).length;
              const isActive = activeFolderId === folder.id;
              return (
                <div key={folder.id} className="group relative flex items-center">
                  <button 
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg font-sans text-sm font-medium transition-all truncate pr-8 flex items-center justify-between ${
                      isActive 
                        ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-semibold' 
                        : 'text-text-secondary hover:bg-signal-surface-raised hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="font-mono text-xs text-text-muted">{count}</span>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                    className="absolute right-1.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-state-danger p-1 rounded transition-opacity"
                    title="Delete Folder"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="mt-2 flex items-center gap-1.5 p-1.5 rounded-lg bg-[#18181c] border border-border-strong">
                <input 
                  autoFocus 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  placeholder="Folder name..." 
                  className="h-8 text-sm px-2.5 bg-transparent text-white border-0 outline-none flex-1 font-sans"
                />
                <button type="submit" className="text-state-success hover:text-white p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-text-muted hover:text-white p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 px-6 sm:px-10 py-8 max-w-7xl">
        
        {/* Document Header with Prominent CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border-hairline mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Folder' : 'Meeting Notes'}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary mt-2 font-normal">
              <span className="font-semibold text-white">{filteredAndSortedMeetings.length} notes</span>
              <span>&bull;</span>
              <span><strong className="text-accent-amber font-semibold">{totalActionsCount}</strong> action items</span>
              <span>&bull;</span>
              <span><strong className="text-state-success font-semibold">{meetings.filter(m => m.status === 'COMPLETED').length}</strong> processed</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleCreateSampleMeeting} 
              disabled={isGeneratingDemo}
              className="h-9 px-4 rounded-lg bg-accent-amber hover:bg-accent-amber-dim text-white text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>{isGeneratingDemo ? 'Creating Note...' : 'Sample Meeting'}</span>
            </button>
          </div>
        </div>

        {/* Database Views & Filter Bar - Symmetrically Aligned */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All', count: meetings.length },
              { id: 'COMPLETED', label: 'Ready', count: meetings.filter(m => m.status === 'COMPLETED').length },
              { id: 'PROCESSING', label: 'Processing', count: meetings.filter(m => m.status !== 'COMPLETED' && m.status !== 'FAILED').length },
              { id: 'FAILED', label: 'Failed', count: meetings.filter(m => m.status === 'FAILED').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === tab.id 
                    ? 'bg-accent-amber text-white shadow-sm' 
                    : 'bg-signal-surface text-text-secondary hover:text-white hover:bg-signal-surface-raised border border-border-hairline'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusFilter === tab.id ? 'bg-black/25 text-white' : 'bg-signal-surface-raised text-text-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Sort, View Controls - Uniform h-9 Height */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <input 
                placeholder="Search notes..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 bg-signal-surface border border-border-hairline rounded-lg px-3 pl-9 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent-amber transition-colors"
              />
              <svg className="w-4 h-4 text-text-muted absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <Select 
              value={sortBy} 
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'a-z', label: 'Title (A-Z)' }
              ]}
              className="w-36 text-sm"
            />

            {/* View Mode Toggle */}
            <div className="flex items-center h-9 bg-signal-surface border border-border-hairline rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-accent-amber text-white' : 'text-text-muted hover:text-white'}`}
                title="Grid Cards"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-accent-amber text-white' : 'text-text-muted hover:text-white'}`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-border-hairline bg-signal-surface p-10">
            <div className="w-14 h-14 rounded-2xl bg-signal-surface-raised border border-border-hairline flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Meeting Notes Yet</h3>
            <p className="text-text-secondary text-sm max-w-md mb-6 leading-relaxed">
              When you join Google Meet, Teams, or Zoom, the WatchNT HUD captures audio and creates clean notes.
            </p>
            <Button 
              onClick={handleCreateSampleMeeting} 
              isLoading={isGeneratingDemo}
              className="rounded-lg text-sm font-semibold px-5 py-2.5"
            >
              Generate Sample Meeting
            </Button>
          </div>
        ) : filteredAndSortedMeetings.length === 0 ? (
          <div className="py-20 text-center text-text-secondary text-sm border border-border-hairline rounded-xl bg-signal-surface p-8">
            No notes match your filter.
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW (High-Contrast Obsidian Note Cards - Uniform Height & Symmetrical) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedMeetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="group relative flex flex-col h-full p-5 rounded-xl bg-signal-surface border border-border-hairline hover:border-accent-amber/50 hover:bg-signal-surface-raised transition-all shadow-surface"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  {editingId === meeting.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <Input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => handleRename(e, meeting.id)}
                        autoFocus
                        className="h-8 text-sm bg-signal-ink rounded"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleRename(e, meeting.id)} className="bg-accent-amber text-white px-3 py-1 text-xs font-semibold rounded">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-white text-xs px-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/meeting/${meeting.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-text-muted mb-1.5">
                        <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-mono font-medium text-text-secondary">
                          {new Date(meeting.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      {/* Fixed 2-line title slot for equal vertical rhythm */}
                      <h3 className="text-base font-semibold text-white line-clamp-2 leading-snug group-hover:text-accent-amber transition-colors min-h-[44px]">
                        {meeting.title}
                      </h3>
                      
                      {/* Property Pills - Uniform Slot */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 min-h-[26px]">
                        {meeting.folder_id && (
                          <span className="text-xs font-medium text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-md">
                            {folders.find(f => f.id === meeting.folder_id)?.name || 'Folder'}
                          </span>
                        )}
                        {meeting.duration_minutes ? (
                          <span className="text-xs font-mono text-zinc-300 bg-signal-surface-raised border border-border-hairline px-2.5 py-0.5 rounded-md">
                            {meeting.duration_minutes}m
                          </span>
                        ) : null}
                        {meeting.provider && (
                          <span className="text-xs font-medium text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-md">
                            {meeting.provider}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  {!editingId && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => startRename(e, meeting)} 
                        className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-signal-surface-elevated transition-colors"
                        title="Rename"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, meeting.id)} 
                        className="p-1.5 rounded-md text-text-muted hover:text-state-danger hover:bg-state-danger/15 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Section - Pin to Bottom */}
                {!editingId && (
                  <Link to={`/meeting/${meeting.id}`} className="mt-auto pt-4 border-t border-border-hairline flex items-center justify-between text-xs font-mono text-text-secondary">
                    <span>
                      {new Date(meeting.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="rounded-xl border border-border-hairline bg-signal-surface overflow-hidden shadow-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-signal-surface-raised border-b border-border-hairline text-text-secondary text-xs uppercase font-mono">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Note Title</th>
                  <th className="px-5 py-3.5 font-bold">Folder</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Date</th>
                  <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {filteredAndSortedMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-signal-surface-raised/70 transition-colors group">
                    <td className="px-5 py-4">
                      <Link to={`/meeting/${meeting.id}`} className="font-semibold text-white hover:text-accent-amber transition-colors flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{meeting.title}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-text-secondary font-mono text-xs">
                      {meeting.folder_id ? (
                        <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md">
                          {folders.find(f => f.id === meeting.folder_id)?.name || 'Folder'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(meeting.status)}
                    </td>
                    <td className="px-5 py-4 font-mono text-text-secondary text-xs">
                      {new Date(meeting.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/meeting/${meeting.id}`} className="px-3 py-1 rounded bg-accent-amber/15 text-accent-amber hover:bg-accent-amber hover:text-white text-xs font-semibold transition-colors">
                          Open Note
                        </Link>
                        <button 
                          onClick={(e) => handleDelete(e, meeting.id)} 
                          className="text-text-muted hover:text-state-danger p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
