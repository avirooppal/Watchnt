// extension/src/dashboard/MeetingDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';
import { Badge } from '../components/Badge';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ExportService } from '../services/ExportService';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'summary' | 'actions' | 'decisions' | 'timeline' | 'entities' | 'transcript' | 'email' | 'chat'>('brief');

  useEffect(() => {
    const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
    fetch(`${storedBackend}/meeting/${id}`)
      .then(res => {
        if (!res.ok) {
           setData({ error: "Not found" });
           return null;
        }
        return res.json();
      })
      .then(resData => { if (resData) setData(resData); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12 space-y-8">
        <Skeleton className="w-full h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-display font-bold tracking-tight mb-2">Meeting not found</h2>
        <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-signal-surface hover:bg-border-hairline rounded-md font-medium transition-colors">
          Return to Library
        </button>
      </div>
    );
  }

  const { meeting, ai, analytics, transcript } = data;
  const status = meeting?.status;
  const title = meeting?.title || 'Meeting Detail';

  const handleRetry = async () => {
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}/retry`, { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const exportCurrentTab = (format: 'md' | 'csv' | 'txt' | 'json') => {
    if (format === 'json') ExportService.exportMeetingAsJSON(data);
    else if (activeTab === 'actions' && format === 'csv') ExportService.exportActionsAsCSV(data);
    else if (activeTab === 'summary' && format === 'md') ExportService.exportSummaryAsMarkdown(data);
    else if (activeTab === 'brief' && format === 'md') ExportService.exportExecutiveBriefAsMarkdown(data);
    else if (activeTab === 'email' && format === 'txt') ExportService.exportEmailAsTXT(data);
  };

  const renderSectionState = (aiBlock: any, renderer: () => any) => {
    if (!aiBlock) return <EmptyState title="Not processed" description="This intelligence artifact is missing." />;
    if (aiBlock.status === 'failed') return <ErrorState what="Processing Failed" why={aiBlock.error || "Unknown error"} fix="Try regenerating or checking the logs." />;
    if (aiBlock.status === 'running' || aiBlock.status === 'pending') return <div className="text-text-muted">Processing...</div>;
    if (aiBlock.status === 'skipped') return <div className="text-text-muted">Skipped.</div>;
    if (!aiBlock.data || (Array.isArray(aiBlock.data) && aiBlock.data.length === 0)) return <EmptyState title="Empty" description="No items found." />;
    return renderer();
  };

  const tabs = [
    { id: 'brief', label: 'Executive Brief' },
    { id: 'summary', label: 'Summary' },
    { id: 'decisions', label: 'Decisions' },
    { id: 'actions', label: 'Action Items' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'entities', label: 'Entities' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'email', label: 'Email' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-8 sm:px-12 py-16 animate-fade-in pb-32">
      <div className="flex items-start gap-6 pb-8 mb-8 border-b-2 border-border-strong">
        <button onClick={() => navigate('/')} className="mt-2 text-text-muted hover:text-text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-5xl font-display leading-tight tracking-tight text-text-primary mb-4">{title}</h1>
          <div className="flex items-center gap-3">
             {status === 'COMPLETED' ? <Badge variant="success">Completed</Badge> : 
              status === 'FAILED' ? <Badge variant="error">Pipeline Failed</Badge> : 
              <Badge variant="neutral">{status}</Badge>}
          </div>
          {/* Analytics Header Row */}
          {analytics && (
            <div className="mt-6 flex flex-wrap gap-6 text-sm font-mono text-text-muted">
              <div><span className="font-bold text-text-primary">{analytics.duration_minutes || 0}</span> Min</div>
              <div><span className="font-bold text-text-primary">{analytics.speakers || 0}</span> Speakers</div>
              <div><span className="font-bold text-accent-amber">{analytics.action_items || 0}</span> Tasks</div>
              <div><span className="font-bold text-state-success">{analytics.decisions || 0}</span> Decisions</div>
            </div>
          )}
        </div>
        <button onClick={() => exportCurrentTab('json')} className="px-3 py-1.5 border border-border-strong text-xs font-mono uppercase hover:bg-signal-surface">
          Export JSON
        </button>
      </div>

      {status === 'FAILED' && (
        <ErrorState what="Pipeline Failed" why="An error occurred during transcription or extraction." fix="Ensure backend is running and you have valid API keys." onRetry={handleRetry} />
      )}

      {/* Tabs */}
      <div className="flex gap-6 overflow-x-auto border-b border-border-strong pb-2 mb-8 scrollbar-none">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-2 text-sm font-sans whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-accent-amber text-accent-amber font-semibold' : 'border-transparent text-text-muted'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Dynamic Export Button Row based on Tab */}
      <div className="flex justify-end mb-4">
        {activeTab === 'actions' && <button onClick={() => exportCurrentTab('csv')} className="text-xs border px-3 py-1">Export CSV</button>}
        {(activeTab === 'summary' || activeTab === 'brief') && <button onClick={() => exportCurrentTab('md')} className="text-xs border px-3 py-1">Export MD</button>}
        {activeTab === 'email' && <button onClick={() => exportCurrentTab('txt')} className="text-xs border px-3 py-1">Export TXT</button>}
      </div>

      {/* Content */}
      <div className="bg-signal-surface border border-border-strong rounded-none p-8 min-h-[400px]">
        
        {activeTab === 'brief' && renderSectionState(ai?.executive_brief, () => (
          <div className="prose prose-invert max-w-none">
            <h2>Purpose</h2><p>{ai.executive_brief.data.purpose}</p>
            <h2>Outcome</h2><p>{ai.executive_brief.data.outcome}</p>
            <h2>Timeline</h2><p>{ai.executive_brief.data.timeline}</p>
          </div>
        ))}

        {activeTab === 'summary' && renderSectionState(ai?.summary, () => (
          <div className="prose prose-invert max-w-none">
            <h2>Snapshot</h2><p>{ai.summary.data.meeting_snapshot}</p>
            <h2>Discussion</h2><p>{ai.summary.data.discussion_summary}</p>
          </div>
        ))}

        {activeTab === 'actions' && renderSectionState(ai?.actions, () => (
          <div className="space-y-4">
            {ai.actions.data.map((a: any, i: number) => (
              <div key={i} className="p-4 border border-border-strong bg-signal-ink">
                <div className="flex justify-between">
                  <h3 className="font-bold">{a.task}</h3>
                  <Badge variant={a.status === 'Completed' ? 'success' : 'neutral'}>{a.status}</Badge>
                </div>
                <div className="mt-2 text-xs font-mono text-text-muted flex gap-4">
                  <span>Owner: {a.owner || 'None'}</span>
                  <span>Due: {a.deadline || 'None'}</span>
                  <span>Priority: {a.priority}</span>
                  <span>Confidence: {a.confidence}</span>
                </div>
                {a.evidence && <div className="mt-2 text-xs italic opacity-70">"{a.evidence}"</div>}
              </div>
            ))}
          </div>
        ))}

        {activeTab === 'decisions' && renderSectionState(ai?.decisions, () => (
          <div className="space-y-4">
            {ai.decisions.data.map((d: any, i: number) => (
              <div key={i} className="p-4 border border-border-strong bg-signal-ink">
                <h3 className="font-bold">{d.decision}</h3>
                {d.reason && <p className="text-sm mt-2">{d.reason}</p>}
                <div className="mt-2 text-xs font-mono text-text-muted flex gap-4">
                  <span>Confidence: {d.confidence}</span>
                  {d.participants && d.participants.length > 0 && <span>By: {d.participants.join(', ')}</span>}
                </div>
                {d.evidence && <div className="mt-2 text-xs italic opacity-70">"{d.evidence}"</div>}
              </div>
            ))}
          </div>
        ))}

        {activeTab === 'timeline' && renderSectionState(ai?.timeline, () => (
          <div className="space-y-4">
            {ai.timeline.data.map((t: any, i: number) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="font-mono text-accent-amber w-16">{t.time}</div>
                <div>{t.title}</div>
              </div>
            ))}
          </div>
        ))}
        
        {activeTab === 'entities' && renderSectionState(ai?.entities, () => (
          <div className="prose prose-invert max-w-none text-sm">
             <pre>{JSON.stringify(ai.entities.data, null, 2)}</pre>
          </div>
        ))}
        
        {activeTab === 'email' && renderSectionState(ai?.email, () => (
          <div className="prose prose-invert max-w-none">
            <h3>Subject: {ai.email.data.subject}</h3>
            <pre className="whitespace-pre-wrap font-sans bg-transparent border-0">{ai.email.data.body}</pre>
          </div>
        ))}

        {activeTab === 'transcript' && (
           <div className="space-y-4 text-sm">
             {transcript?.segments ? transcript.segments.map((s: any, i: number) => (
               <div key={i} className="flex gap-4">
                 <span className="font-mono text-text-muted opacity-50 w-12 text-right">
                   {Math.floor(s.start / 60)}:{(Math.floor(s.start % 60)).toString().padStart(2, '0')}
                 </span>
                 <div><strong className="opacity-80">[{s.speaker || 'All'}]</strong> {s.text}</div>
               </div>
             )) : <EmptyState title="No transcript" description="Transcript data is not available." />}
           </div>
        )}

      </div>
    </div>
  );
}
