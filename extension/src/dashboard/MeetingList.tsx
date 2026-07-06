import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Meeting, Folder } from '../../../shared/types/meeting';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Select } from '../components/Select';
import { Button } from '../components/Button';

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [insights, setInsights] = useState<{total_meetings: number, total_actions: number, meetings_this_week: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z'>('newest');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const fetchMeetings = async () => {
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/meetings`);
      const data = await res.json();
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/folders`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInsights = async () => {
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/meetings/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchFolders();
    fetchInsights();
    const interval = setInterval(() => {
      fetchMeetings();
      fetchFolders();
      fetchInsights();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}`, { method: 'DELETE' });
      setMeetings(m => m.filter(meeting => meeting.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this folder? Meetings inside will NOT be deleted, they will just move back to All Meetings.")) return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/folder/${id}`, { method: 'DELETE' });
      setFolders(f => f.filter(folder => folder.id !== id));
      if (activeFolderId === id) setActiveFolderId(null);
      // Refresh meetings so they reflect no folder
      fetchMeetings();
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startRename = (e: React.MouseEvent | React.KeyboardEvent, meeting: Meeting) => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <span title="Pipeline finished successfully"><Badge variant="success">Completed</Badge></span>;
      case 'FAILED': return <span title="An error occurred during transcription or generation"><Badge variant="error">Failed</Badge></span>;
      case 'RECORDING': return (
        <span title="Currently capturing audio from the meeting" className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-state-danger bg-state-danger/10 px-2 py-0.5 rounded-full border border-state-danger/20">
          <div className="w-1.5 h-1.5 rounded-full bg-state-danger animate-pulse" /> Recording
        </span>
      );
      default: return (
        <span title={`Processing step: ${status}`} className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-accent-amber-dim bg-accent-amber/10 px-2 py-0.5 rounded-full border border-accent-amber/20">
          <div className="w-2 h-2 rounded-full border-2 border-accent-amber-dim border-t-transparent animate-spin" /> {status}
        </span>
      );
    }
  };

  const filteredAndSortedMeetings = useMemo(() => meetings
    .filter(m => activeFolderId ? m.folder_id === activeFolderId : true)
    .filter(m => m.title?.toLowerCase().includes(search.toLowerCase()) || m.status?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.title.localeCompare(b.title);
    }), [meetings, search, sortBy, activeFolderId]);

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-strong bg-signal-surface shrink-0 hidden md:flex flex-col py-8 animate-fade-in">
        <div className="px-6 mb-6">
          <h3 className="text-[10px] uppercase font-mono tracking-widest text-text-muted mb-4 font-bold">Library</h3>
          <button 
            onClick={() => setActiveFolderId(null)}
            className={`w-full text-left px-3 py-2 rounded-md font-sans text-sm font-medium transition-colors ${!activeFolderId ? 'bg-signal-ink text-accent-amber border border-border-strong' : 'text-text-primary hover:bg-signal-ink hover:text-white'}`}
          >
            All Meetings
          </button>
        </div>

        <div className="px-6 flex-1 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between mb-4 group">
            <h3 className="text-[10px] uppercase font-mono tracking-widest text-text-muted font-bold">Folders</h3>
            <button onClick={() => setIsCreatingFolder(true)} className="text-text-muted hover:text-white transition-colors" title="New Folder">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            {folders.map(folder => (
              <div key={folder.id} className="group relative flex items-center">
                <button 
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-md font-sans text-sm font-medium transition-colors truncate pr-8 ${activeFolderId === folder.id ? 'bg-signal-ink text-accent-amber border border-border-strong' : 'text-text-primary hover:bg-signal-ink hover:text-white'}`}
                >
                  <span className="opacity-50 mr-2">#</span>{folder.name}
                </button>
                <button 
                  onClick={(e) => handleDeleteFolder(e, folder.id)}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 text-state-danger hover:text-white transition-all duration-300"
                  title="Delete Folder"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="mt-2 flex items-center gap-2">
                <Input 
                  autoFocus 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  placeholder="Folder name..." 
                  className="h-8 text-sm px-2 bg-signal-ink border-border-strong flex-1"
                />
                <button type="submit" className="text-state-success hover:text-white p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-state-danger hover:text-white p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-8 sm:px-12 py-12 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-border-strong pb-10 mb-12">
          <div>
            <h2 className="text-4xl font-display tracking-tight text-text-primary">
              {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Folder' : 'Meeting Library'}
            </h2>
            <p className="mt-4 text-text-muted font-sans font-medium text-sm max-w-md leading-relaxed">
              {activeFolderId ? `Meetings stored in ${folders.find(f => f.id === activeFolderId)?.name || 'this folder'}.` : 'Review your past conversations and generated insights.'}
            </p>
          </div>
          
          {insights && !activeFolderId && (
            <div className="flex items-center gap-8 hidden lg:flex bg-signal-surface-raised border border-border-strong rounded-none px-8 py-4 shadow-floating">
              <div className="flex flex-col">
                <span className="text-3xl font-display text-text-primary">{insights.total_meetings}</span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted mt-1">Meetings</span>
              </div>
              <div className="w-px h-10 bg-border-strong"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-display text-accent-amber">{insights.total_actions}</span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted mt-1">Actions</span>
              </div>
              <div className="w-px h-10 bg-border-strong"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-display text-state-success">{insights.meetings_this_week}</span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted mt-1">This Week</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select 
              value={sortBy} 
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'a-z', label: 'A-Z' }
              ]}
              className="w-full md:w-40"
            />
            <Input 
              placeholder="Search meetings (e.g. 'failed')" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 bg-signal-surface shadow-surface"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] rounded-none" />)}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center rounded-none border border-border-strong bg-signal-surface shadow-surface">
            <div className="w-16 h-16 rounded-none bg-signal-surface-raised border border-border-strong flex items-center justify-center mb-6">
               <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <h3 className="text-2xl font-display text-text-primary mb-2">No meetings yet</h3>
            <p className="text-text-muted font-sans text-sm max-w-sm mb-8 leading-relaxed">Join a Google Meet, click the WatchNT extension, and press Start Recording. Your meetings will appear here.</p>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => window.open('https://github.com/avirooppal/Watchnt', '_blank')}>Read Documentation</Button>
              <Button variant="ghost" onClick={() => window.open('https://www.youtube.com/watch?v=gLmGs812cEA&autoplay=1', '_blank')}>Watch Demo</Button>
            </div>
          </div>
        ) : filteredAndSortedMeetings.length === 0 ? (
          <div className="py-20 text-center text-text-muted text-sm border border-border-strong bg-signal-surface p-8">
            No meetings found matching "{search}" in this folder.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
            {filteredAndSortedMeetings.map((meeting) => (
              <div key={meeting.id} className="group relative block h-full flex flex-col p-8 rounded-none bg-signal-surface border border-border-strong shadow-surface transition-all duration-500 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-floating">
                
                <div className="flex items-start justify-between gap-4 mb-6">
                  {editingId === meeting.id ? (
                    <div className="flex-1 flex flex-col gap-3">
                      <Input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => handleRename(e, meeting.id)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        className="h-10 py-1 px-3 text-sm font-display text-text-primary bg-signal-ink"
                        placeholder="Meeting Title"
                      />
                      <div className="flex items-center gap-2">
                        <Select 
                          value={editFolderId || ''} 
                          onChange={(val) => setEditFolderId(val || null)}
                          options={[
                            { value: '', label: 'No Folder' },
                            ...folders.map(f => ({ value: f.id, label: f.name }))
                          ]}
                          className="w-full text-xs"
                        />
                        <button onClick={(e) => handleRename(e, meeting.id)} className="bg-signal-ink border border-border-strong hover:bg-accent-amber hover:text-signal-ink hover:border-transparent text-text-primary px-3 py-1 text-sm font-semibold transition-colors duration-300">
                          SAVE
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(null); }} className="bg-transparent border border-border-strong hover:bg-state-danger/10 text-text-muted hover:text-state-danger px-3 py-1 text-sm transition-colors duration-300">
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/meeting/${meeting.id}`} className="flex-1">
                      <h3 className="text-xl font-display font-medium text-text-primary line-clamp-2 leading-snug group-hover:text-accent-amber transition-colors duration-300">
                        {meeting.title}
                      </h3>
                      {meeting.folder_id && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-text-muted bg-signal-ink px-2 py-1 border border-border-hairline">
                          <span className="opacity-50">#</span>
                          {folders.find(f => f.id === meeting.folder_id)?.name || 'Unknown'}
                        </div>
                      )}
                      {meeting.duration_minutes && (
                        <div className="mt-2 ml-2 inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-text-muted bg-signal-ink px-2 py-1 border border-border-hairline">
                          {meeting.duration_minutes} min
                        </div>
                      )}
                      {meeting.provider && (
                        <div className="mt-2 ml-2 inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-text-muted bg-signal-ink px-2 py-1 border border-border-hairline">
                          {meeting.provider}
                        </div>
                      )}
                    </Link>
                  )}
                  
                  {!editingId && (
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 bg-signal-surface pl-2">
                      <button 
                        onClick={(e) => startRename(e, meeting)} 
                        className="text-text-muted hover:text-white transition-colors" 
                        title="Edit Meeting"
                        aria-label="Edit meeting"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, meeting.id)} 
                        className="text-state-danger/70 hover:text-state-danger transition-colors" 
                        title="Delete"
                        aria-label="Delete meeting"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {!editingId && (
                  <Link to={`/meeting/${meeting.id}`} className="flex-1 flex flex-col pt-4">
                    <div className="flex items-center gap-3 mb-8">
                      {getStatusBadge(meeting.status)}
                    </div>

                    <div className="mt-auto pt-6 border-t border-border-strong flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                      <span className="font-mono">
                        {new Date(meeting.created_at).toLocaleDateString(undefined, { 
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                        })}
                      </span>
                      <span className="flex items-center gap-2 group-hover:text-accent-amber transition-colors duration-300">
                        Read <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
