import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';
import { Badge } from '../components/Badge';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'transcript' | 'email'>('summary');

  useEffect(() => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    fetch(`${storedBackend}/meeting/${id}`)
      .then(res => res.json())
      .then(resData => setData(resData))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12 space-y-8">
        <div className="flex gap-4 items-center">
           <Skeleton className="w-10 h-10 rounded-full" />
           <div>
             <Skeleton className="w-64 h-8 mb-2" />
             <Skeleton className="w-32 h-4" />
           </div>
        </div>
        <Skeleton className="w-full h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-full bg-state-danger/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-state-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight mb-2">Meeting not found</h2>
        <p className="text-text-muted mb-6">This recording may have been deleted or is inaccessible.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-signal-surface hover:bg-border-hairline rounded-md font-medium transition-colors">
          Return to Library
        </button>
      </div>
    );
  }

  const { metadata, summary, actions, transcript, email } = data;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'actions', label: 'Action Items' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'email', label: 'Email Draft' }
  ];

  const downloadFile = (content: string, filename: string, type: 'text/plain' | 'text/markdown') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCurrentTab = (format: 'md' | 'txt') => {
    let content = '';
    const dateStr = metadata?.created_at ? new Date(metadata.created_at).toISOString().split('T')[0] : 'export';
    let filename = `WatchNT_${activeTab}_${dateStr}.${format}`;

    if (activeTab === 'summary') {
      content = summary || 'No summary available.';
      if (format === 'md' && !content.startsWith('#')) content = `# Meeting Summary\n\n${content}`;
    } else if (activeTab === 'actions') {
      if (!actions || actions.length === 0) {
        content = 'No action items available.';
      } else if (typeof actions === 'string') {
        content = actions;
        if (format === 'md' && !content.startsWith('#')) content = `# Action Items\n\n${content}`;
      } else {
        if (format === 'md') {
          content = '# Action Items\n\n' + actions.map((a: any) => 
            `- [ ] **${a.task}**\n  - Priority: ${a.priority || 'Normal'}\n  - Owner: ${a.owner || 'Unassigned'}\n  - Due: ${a.deadline || 'None'}`
          ).join('\n\n');
        } else {
          content = 'ACTION ITEMS\n\n' + actions.map((a: any) => 
            `[${a.priority ? a.priority.toUpperCase() : 'NORMAL'}] ${a.task}\nOwner: ${a.owner || 'Unassigned'}\nDue: ${a.deadline || 'None'}\n`
          ).join('\n');
        }
      }
    } else if (activeTab === 'transcript') {
      if (!transcript || !transcript.segments) {
        content = 'No transcript available.';
      } else {
        const title = format === 'md' ? `# Meeting Transcript\n\n` : `MEETING TRANSCRIPT\n\n`;
        content = title + transcript.segments.map((s: any) => {
          const min = Math.floor(s.start / 60);
          const sec = Math.floor(s.start % 60).toString().padStart(2, '0');
          const timestamp = `[${min}:${sec}]`;
          const speakerMd = s.speaker && s.speaker !== 'All' ? ` **${s.speaker}**: ` : ' ';
          const speakerTxt = s.speaker && s.speaker !== 'All' ? ` ${s.speaker}: ` : ' ';
          return format === 'md' ? `\`${timestamp}\`${speakerMd}${s.text}` : `${timestamp}${speakerTxt}${s.text}`;
        }).join('\n\n');
      }
    } else if (activeTab === 'email') {
      content = email || 'No email draft available.';
    }

    downloadFile(content, filename, format === 'md' ? 'text/markdown' : 'text/plain');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-10 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-start gap-4 pb-8 mb-8 border-b border-border-hairline">
        <button 
          onClick={() => navigate('/')}
          className="mt-1 shrink-0 p-2 rounded-full hover:bg-signal-surface text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary">{metadata?.title || 'Meeting Detail'}</h1>
            {metadata?.status === 'COMPLETED' ? <Badge variant="success">Completed</Badge> : <Badge variant="neutral">Processing</Badge>}
          </div>
          <p className="text-sm text-text-muted font-medium">
            {metadata?.created_at ? new Date(metadata.created_at).toLocaleString(undefined, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
            }) : 'Unknown Date'}
          </p>
        </div>
      </div>

      {/* Tabs & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-accent-amber text-white shadow-button' 
                  : 'text-text-muted hover:text-text-primary hover:bg-signal-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 shrink-0 bg-signal-surface px-3 py-1.5 rounded-lg border border-border-hairline shadow-surface">
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 hidden sm:inline-block">Export</span>
          <button 
            onClick={() => exportCurrentTab('txt')}
            className="px-2 py-1 text-xs font-bold rounded bg-signal-ink border border-border-hairline text-text-primary hover:bg-border-hairline hover:text-white transition-colors"
          >
            TXT
          </button>
          <button 
            onClick={() => exportCurrentTab('md')}
            className="px-2 py-1 text-xs font-bold rounded bg-signal-ink border border-border-hairline text-text-primary hover:bg-border-hairline hover:text-white transition-colors"
          >
            MD
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-signal-surface border border-border-hairline rounded-xl p-8 shadow-surface min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="prose prose-invert prose-watchnt max-w-none text-text-primary/90 leading-relaxed">
            {summary ? (
              <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted opacity-60">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="font-medium">Summary is being generated...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            {!actions || actions.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-text-muted opacity-60">
                 <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                 <p className="font-medium">No action items extracted.</p>
               </div>
            ) : typeof actions === 'string' ? (
              <p className="text-text-primary leading-relaxed">{actions}</p>
            ) : (
              <div className="grid gap-4">
                {actions.map((action: any, i: number) => (
                  <div key={i} className="p-5 rounded-lg bg-signal-ink border border-border-hairline flex flex-col gap-3 group hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <span className="font-medium text-base text-text-primary group-hover:text-accent-amber-dim transition-colors">{action.task}</span>
                      {action.priority && (
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider shrink-0 ${
                          action.priority.toLowerCase() === 'high' ? 'bg-state-danger/10 text-state-danger border border-state-danger/20' :
                          action.priority.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-state-success/10 text-state-success border border-state-success/20'
                        }`}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-text-muted pt-2">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {action.owner}
                      </span>
                      {action.deadline && action.deadline.toLowerCase() !== 'none' && (
                        <span className="flex items-center gap-1.5 text-accent-amber-dim">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {action.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-8 pr-4">
            {!transcript || !transcript.segments ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted opacity-60">
                 <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 <p className="font-medium">No transcript available.</p>
              </div>
            ) : (
              transcript.segments.map((segment: any, i: number) => (
                <div key={i} className="flex gap-4 lg:gap-6 group">
                  <div className="w-12 lg:w-16 shrink-0 text-right text-[11px] font-mono font-semibold text-text-muted/60 pt-1.5">
                    {Math.floor(segment.start / 60)}:{(Math.floor(segment.start % 60)).toString().padStart(2, '0')}
                  </div>
                  <div className="text-text-primary/90 text-[15px] leading-relaxed group-hover:text-white transition-colors">
                    {segment.speaker && segment.speaker !== 'All' && (
                      <span className={`font-semibold mr-2 ${segment.speaker === 'Me' ? 'text-accent-amber-dim' : 'text-text-muted'}`}>
                        [{segment.speaker}]
                      </span>
                    )}
                    {segment.text}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'email' && (
          <div>
            {email ? (
              <div dangerouslySetInnerHTML={{ __html: email.replace(/\n/g, '<br/>') }} className="prose prose-invert prose-watchnt max-w-none text-text-primary/90 leading-relaxed bg-signal-ink p-6 rounded-lg border border-border-hairline" />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted opacity-60">
                 <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 <p className="font-medium">Email draft not generated yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
