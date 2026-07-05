import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Meeting } from '../../../shared/types/meeting';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Select } from '../components/Select';
import { Button } from '../components/Button';

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [insights, setInsights] = useState<{total_meetings: number, total_actions: number, meetings_this_week: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z'>('newest');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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
    fetchInsights();
    const interval = setInterval(() => {
      fetchMeetings();
      fetchInsights();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}`, { method: 'DELETE' });
      setMeetings(m => m.filter(meeting => meeting.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const startRename = (e: React.MouseEvent | React.KeyboardEvent, meeting: Meeting) => {
    e.preventDefault();
    setEditingId(meeting.id);
    setEditTitle(meeting.title);
  };

  const handleRename = async (e: React.KeyboardEvent | React.MouseEvent, id: string) => {
    e.preventDefault();
    if ('key' in e && e.key !== 'Enter') return;
    
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      });
      setMeetings(m => m.map(meeting => meeting.id === id ? { ...meeting, title: editTitle } : meeting));
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
    .filter(m => m.title?.toLowerCase().includes(search.toLowerCase()) || m.status?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.title.localeCompare(b.title);
    }), [meetings, search, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-hairline pb-8 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight text-text-primary">Meeting Library</h2>
          <p className="mt-2 text-text-muted font-medium text-sm">Review your past conversations and generated insights.</p>
        </div>
        
        {insights && (
          <div className="flex items-center gap-6 hidden lg:flex bg-signal-surface border border-border-hairline rounded-lg px-6 py-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-text-primary">{insights.total_meetings}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Meetings</span>
            </div>
            <div className="w-px h-8 bg-border-hairline"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-accent-amber">{insights.total_actions}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Actions</span>
            </div>
            <div className="w-px h-8 bg-border-hairline"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-state-success">{insights.meetings_this_week}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">This Week</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[200px] rounded-lg" />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-border-hairline bg-signal-surface-raised">
          <div className="w-12 h-12 rounded-full bg-accent-amber/10 flex items-center justify-center mb-4">
             <svg className="w-6 h-6 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
          <h3 className="text-lg font-display font-bold text-text-primary mb-1">No meetings yet.</h3>
          <p className="text-text-muted text-sm max-w-sm mb-6">Join a Google Meet, click the WatchNT extension, and press Start Recording. Your meetings will appear here.</p>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => window.open('https://github.com/cameronking4/watchnt', '_blank')}>Read Documentation</Button>
            <Button variant="ghost" onClick={() => window.open('https://youtube.com', '_blank')}>Watch Demo</Button>
          </div>
        </div>
      ) : filteredAndSortedMeetings.length === 0 ? (
        <div className="py-20 text-center text-text-muted text-sm">
          No meetings found matching "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMeetings.map((meeting) => (
            <div key={meeting.id} className="group relative block h-full flex flex-col p-6 rounded-lg bg-signal-surface border border-border-hairline shadow-surface transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-glow">
              
              <div className="flex items-start justify-between gap-4 mb-4">
                {editingId === meeting.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input 
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => handleRename(e, meeting.id)}
                      autoFocus
                      className="h-8 py-1 px-2 text-sm"
                    />
                    <button onClick={(e) => handleRename(e, meeting.id)} className="text-state-success hover:text-white p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-state-danger hover:text-white p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <Link to={`/meeting/${meeting.id}`} className="flex-1">
                    <h3 className="text-base font-display font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-accent-amber-dim transition-colors">
                      {meeting.title}
                    </h3>
                  </Link>
                )}
                
                {!editingId && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => startRename(e, meeting)} 
                      onKeyDown={(e) => e.key === 'Enter' && startRename(e, meeting)}
                      className="text-text-muted hover:text-white transition-colors" 
                      title="Rename"
                      aria-label="Rename meeting"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, meeting.id)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleDelete(e, meeting.id)}
                      className="text-state-danger/70 hover:text-state-danger transition-colors" 
                      title="Delete"
                      aria-label="Delete meeting"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
              
              <Link to={`/meeting/${meeting.id}`} className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  {getStatusBadge(meeting.status)}
                </div>

                <div className="mt-auto pt-5 border-t border-border-hairline flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <span className="font-mono">
                    {new Date(meeting.created_at).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                    })}
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-text-primary transition-colors">
                    View <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

