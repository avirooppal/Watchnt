// extension/src/dashboard/MeetingDetail.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';
import { Badge } from '../components/Badge';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ExportService } from '../services/ExportService';
import { useToast } from '../contexts/ToastContext';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'summary' | 'actions' | 'decisions' | 'timeline' | 'entities' | 'transcript' | 'email' | 'chat'>('brief');
  
  // Transcript search
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Checked tasks local toggle state
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});

  // Unique speakers in transcript (declared before any returns)
  const transcript = data?.transcript;
  const speakersList = useMemo(() => {
    if (!transcript?.segments) return [];
    const set = new Set<string>();
    transcript.segments.forEach((s: any) => {
      if (s.speaker) set.add(s.speaker);
    });
    return Array.from(set);
  }, [transcript]);

  // Filtered transcript (declared before any returns)
  const filteredSegments = useMemo(() => {
    if (!transcript?.segments) return [];
    return transcript.segments.filter((s: any) => {
      const matchSpeaker = selectedSpeaker === 'all' || s.speaker === selectedSpeaker;
      const matchText = !transcriptSearch || s.text?.toLowerCase().includes(transcriptSearch.toLowerCase());
      return matchSpeaker && matchText;
    });
  }, [transcript, selectedSpeaker, transcriptSearch]);

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
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10 space-y-6">
        <Skeleton className="w-full h-32 rounded-xl" />
        <Skeleton className="w-full h-96 rounded-xl" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-xl bg-signal-surface border border-border-hairline flex items-center justify-center mb-3 text-text-muted">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Note Not Found</h2>
        <p className="text-sm text-text-secondary mb-5">This meeting note may have been deleted or the backend ID changed.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-signal-surface-raised border border-border-hairline rounded-lg text-sm text-white font-medium hover:bg-signal-surface-elevated transition-colors">
          Return to Library
        </button>
      </div>
    );
  }

  const { meeting, ai, analytics } = data;
  const status = meeting?.status;
  const title = meeting?.title || 'Meeting Note';

  const handleRetry = async () => {
    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      await fetch(`${storedBackend}/meeting/${id}/retry`, { method: 'POST' });
      showToast('Pipeline retry requested', 'info');
      window.location.reload();
    } catch {
      showToast('Retry failed. Is backend running?', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied!`, 'success');
  };

  const exportCurrentTab = (format: 'md' | 'csv' | 'txt' | 'json') => {
    if (format === 'json') {
      ExportService.exportMeetingAsJSON(data);
      showToast('Exported complete JSON', 'success');
    } else if (activeTab === 'actions' && format === 'csv') {
      ExportService.exportActionsAsCSV(data);
      showToast('Exported Action Items (CSV)', 'success');
    } else if (activeTab === 'summary' && format === 'md') {
      ExportService.exportSummaryAsMarkdown(data);
      showToast('Exported Summary (Markdown)', 'success');
    } else if (activeTab === 'brief' && format === 'md') {
      ExportService.exportExecutiveBriefAsMarkdown(data);
      showToast('Exported Executive Brief (Markdown)', 'success');
    } else if (activeTab === 'email' && format === 'txt') {
      ExportService.exportEmailAsTXT(data);
      showToast('Exported Follow-up Email', 'success');
    }
  };

  // AI Chat Handler
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMsg = chatInput.trim();
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatSending(true);

    try {
      const storedBackend = localStorage.getItem('backendUrl') || 'http://localhost:8000';
      const res = await fetch(`${storedBackend}/meeting/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      if (res.ok) {
        const resData = await res.json();
        setChatMessages([...newMessages, { role: 'assistant', content: resData.response }]);
      } else {
        setChatMessages([...newMessages, { role: 'assistant', content: "Could not generate an answer. Ensure LLM engine is running." }]);
      }
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: "Failed to connect to chat service." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const renderSectionState = (aiBlock: any, renderer: () => any) => {
    if (!aiBlock) return <EmptyState title="Artifact Pending" description="This intelligence artifact has not been extracted yet." />;
    if (aiBlock.status === 'failed') return <ErrorState what="Processing Failed" why={aiBlock.error || "Unknown error"} fix="Verify LLM provider credentials in Settings." onRetry={handleRetry} />;
    if (aiBlock.status === 'running' || aiBlock.status === 'pending') {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
          <div className="w-6 h-6 rounded-full border-2 border-accent-amber border-t-transparent animate-spin" />
          <span className="text-sm font-mono font-medium">Extracting meeting intelligence...</span>
        </div>
      );
    }
    if (aiBlock.status === 'skipped') return <div className="text-text-muted text-sm p-4">Skipped in current pipeline.</div>;
    if (!aiBlock.data || (Array.isArray(aiBlock.data) && aiBlock.data.length === 0)) return <EmptyState title="No Items Found" description="The conversation contained no explicit items for this category." />;
    return renderer();
  };

  const tabs = [
    { id: 'brief', label: 'Executive Brief' },
    { id: 'summary', label: 'Summary' },
    { id: 'actions', label: 'Action Items', count: ai?.actions?.data?.length },
    { id: 'decisions', label: 'Decisions', count: ai?.decisions?.data?.length },
    { id: 'timeline', label: 'Timeline', count: ai?.timeline?.data?.length },
    { id: 'entities', label: 'Entities' },
    { id: 'transcript', label: 'Transcript', count: transcript?.segments?.length },
    { id: 'email', label: 'Follow-up Email' },
    { id: 'chat', label: 'Ask Copilot' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10 pb-36 font-sans">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Notes
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportCurrentTab('json')} 
            className="px-3.5 py-1.5 rounded-lg border border-border-hairline bg-signal-surface hover:bg-signal-surface-raised text-xs font-semibold text-text-secondary hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* Notion Document Header & Property Inspector */}
      <div className="pb-8 mb-8 border-b border-border-hairline">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5 leading-tight">
          {title}
        </h1>

        {/* Notion Properties Grid - Scaled & High Contrast */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8 text-sm bg-signal-surface p-5 rounded-xl border border-border-hairline shadow-surface">
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Status:</span>
            <span>
              {status === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready
                </span>
              ) : status === 'FAILED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Failed
                </span>
              ) : (
                <Badge variant="neutral">{status}</Badge>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Date:</span>
            <span className="font-mono text-sm text-text-secondary">
              {meeting?.created_at ? new Date(meeting.created_at).toLocaleString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : '-'}
            </span>
          </div>

          {analytics && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Duration:</span>
                <span className="font-semibold text-white">{analytics.duration_minutes || 0} minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Speakers:</span>
                <span className="font-semibold text-white">{analytics.speakers || 0} participants</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Tasks:</span>
                <span className="font-semibold text-accent-amber">{analytics.action_items || 0} action items</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono uppercase font-bold w-24 shrink-0">Decisions:</span>
                <span className="font-semibold text-emerald-400">{analytics.decisions || 0} confirmed</span>
              </div>
            </>
          )}
        </div>

        {status === 'FAILED' && (
          <div className="mt-4 flex items-center justify-between p-3.5 bg-state-danger/15 border border-state-danger/30 rounded-xl text-sm text-red-200">
            <span>Pipeline processing failed. Check local provider connection.</span>
            <button 
              onClick={handleRetry}
              className="px-3 py-1.5 bg-state-danger text-white rounded-lg text-xs font-bold hover:bg-state-danger/90"
            >
              Retry Pipeline
            </button>
          </div>
        )}
      </div>

      {/* Clean Notion Tab Strip - Distinct & Legible */}
      <div className="flex gap-2 overflow-x-auto border-b border-border-hairline mb-8 pb-2 scrollbar-none">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-accent-amber text-white shadow-sm' 
                : 'text-text-secondary hover:text-white hover:bg-signal-surface border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-black/25 text-white' : 'bg-signal-surface-raised text-text-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Contextual Export Toolbar */}
      <div className="flex items-center justify-between mb-5 text-sm text-text-muted">
        <div>
          Viewing: <span className="text-white font-semibold">{tabs.find(t => t.id === activeTab)?.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'actions' && (
            <button onClick={() => exportCurrentTab('csv')} className="border border-border-hairline px-3 py-1 rounded-lg hover:bg-signal-surface text-text-secondary hover:text-white text-xs font-semibold transition-colors">
              Export CSV
            </button>
          )}
          {(activeTab === 'summary' || activeTab === 'brief') && (
            <button onClick={() => exportCurrentTab('md')} className="border border-border-hairline px-3 py-1 rounded-lg hover:bg-signal-surface text-text-secondary hover:text-white text-xs font-semibold transition-colors">
              Export Markdown
            </button>
          )}
          {activeTab === 'email' && (
            <button onClick={() => exportCurrentTab('txt')} className="border border-border-hairline px-3 py-1 rounded-lg hover:bg-signal-surface text-text-secondary hover:text-white text-xs font-semibold transition-colors">
              Export TXT
            </button>
          )}
        </div>
      </div>

      {/* Main Document Body */}
      <div className="min-h-[450px]">
        
        {/* 1. EXECUTIVE BRIEF */}
        {activeTab === 'brief' && renderSectionState(ai?.executive_brief, () => (
          <div className="space-y-6">
            {/* Notion Callout: Purpose */}
            <div className="p-5 rounded-r-xl border border-border-hairline border-l-4 border-l-accent-amber bg-signal-surface">
              <h3 className="text-xs font-mono uppercase tracking-wider text-accent-amber font-bold mb-2">Meeting Purpose</h3>
              <p className="text-base text-white font-medium leading-relaxed">{ai.executive_brief.data.purpose}</p>
            </div>

            {/* Notion Callout: Outcome */}
            <div className="p-5 rounded-r-xl border border-border-hairline border-l-4 border-l-emerald-400 bg-signal-surface">
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2">Key Outcome</h3>
              <p className="text-base text-white font-medium leading-relaxed">{ai.executive_brief.data.outcome}</p>
            </div>

            {ai.executive_brief.data.key_decisions && ai.executive_brief.data.key_decisions.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold mb-3">Key Strategic Decisions</h3>
                <div className="space-y-2">
                  {ai.executive_brief.data.key_decisions.map((d: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm p-4 rounded-xl bg-signal-surface border border-border-hairline text-white font-medium">
                      <span className="text-accent-amber font-mono font-bold text-base">{i + 1}.</span>
                      <span className="leading-relaxed">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ai.executive_brief.data.risks && ai.executive_brief.data.risks.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold mb-3">Risks & Blockers</h3>
                <div className="space-y-2">
                  {ai.executive_brief.data.risks.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm p-4 rounded-xl bg-red-500/10 text-red-100 border border-red-500/30 font-medium">
                      <span className="text-red-400 font-bold">&bull;</span>
                      <span className="leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ai.executive_brief.data.immediate_next_steps && ai.executive_brief.data.immediate_next_steps.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold mb-3">Immediate Next Steps</h3>
                <div className="space-y-2">
                  {ai.executive_brief.data.immediate_next_steps.map((step: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm p-3.5 rounded-xl bg-sky-500/10 text-sky-100 border border-sky-500/30 font-medium">
                      <span className="text-sky-400 font-mono font-bold">&rarr;</span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ai.executive_brief.data.timeline && (
              <div className="text-sm font-mono text-text-secondary bg-signal-surface p-4 rounded-xl border border-border-hairline">
                <strong className="text-white">Timeline Outlook:</strong> {ai.executive_brief.data.timeline}
              </div>
            )}
          </div>
        ))}

        {/* 2. FULL SUMMARY */}
        {activeTab === 'summary' && renderSectionState(ai?.summary, () => (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-signal-surface border border-border-hairline">
              <h3 className="text-xs font-mono uppercase tracking-wider text-accent-amber font-bold mb-2">Executive Summary</h3>
              <p className="text-base text-white leading-relaxed font-medium">{ai.summary.data.meeting_snapshot}</p>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold mb-2">Discussion Notes</h3>
              <div className="text-sm text-text-secondary leading-relaxed bg-signal-surface p-5 rounded-xl border border-border-hairline whitespace-pre-line font-normal">
                {ai.summary.data.discussion_summary}
              </div>
            </div>

            {ai.summary.data.highlights && ai.summary.data.highlights.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold mb-3">Key Highlights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ai.summary.data.highlights.map((h: string, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-signal-surface border border-border-hairline text-sm text-white font-medium leading-relaxed flex items-start gap-3">
                      <span className="text-accent-amber font-bold">&bull;</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 3. ACTION ITEMS */}
        {activeTab === 'actions' && renderSectionState(ai?.actions, () => (
          <div className="space-y-3">
            {ai.actions.data.map((action: any, idx: number) => {
              const isDone = !!checkedTasks[idx];
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border transition-all ${
                    isDone 
                      ? 'bg-signal-ink border-border-hairline opacity-50' 
                      : 'bg-signal-surface border-border-hairline hover:border-accent-amber/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={isDone}
                        onChange={() => setCheckedTasks(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="mt-1 w-5 h-5 rounded bg-signal-ink border-border-strong text-accent-amber focus:ring-0 cursor-pointer" 
                      />
                      <div className="flex-1">
                        <span className={`text-base font-semibold ${isDone ? 'line-through text-text-muted' : 'text-white'}`}>
                          {action.task}
                        </span>
                        {action.evidence && (
                          <p className="mt-1.5 text-xs text-text-secondary italic">
                            "{action.evidence}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {action.priority && (
                        <span className={`text-xs font-mono px-2.5 py-0.5 rounded-md font-bold uppercase ${
                          action.priority === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                          action.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-signal-surface-raised text-text-secondary border border-border-hairline'
                        }`}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border-hairline flex items-center justify-between text-xs font-mono text-text-secondary">
                    <div className="flex items-center gap-4">
                      <span>Owner: <strong className="text-white">{action.owner || 'Unassigned'}</strong></span>
                      <span>Due: <strong className="text-white">{action.deadline || 'None'}</strong></span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(action.task, "Task")}
                      className="text-text-muted hover:text-accent-amber text-xs underline"
                    >
                      Copy Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 4. DECISIONS */}
        {activeTab === 'decisions' && renderSectionState(ai?.decisions, () => (
          <div className="space-y-3">
            {ai.decisions.data.map((d: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-signal-surface border border-border-hairline shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-base font-bold text-white leading-snug">{d.decision}</h4>
                    {d.reason && <p className="text-sm text-text-secondary leading-relaxed">{d.reason}</p>}
                    {d.evidence && (
                      <p className="mt-1.5 text-xs italic text-text-muted">
                        "{d.evidence}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md font-bold uppercase shrink-0">
                    {d.status || 'Confirmed'}
                  </span>
                </div>

                {d.participants && d.participants.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border-hairline text-xs font-mono text-text-secondary">
                    Consensus by: <strong className="text-white">{d.participants.join(', ')}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* 5. TIMELINE */}
        {activeTab === 'timeline' && renderSectionState(ai?.timeline, () => (
          <div className="space-y-3">
            <div className="border-l-2 border-border-hairline ml-3 pl-5 space-y-4 py-2">
              {ai.timeline.data.map((t: any, idx: number) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[27px] top-2 w-3 h-3 rounded-full bg-accent-amber shadow-sm" />
                  <div className="p-4 rounded-xl bg-signal-surface border border-border-hairline flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-accent-amber font-bold mr-3">{t.time}</span>
                      <span className="text-sm text-white font-medium">{t.title}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab('transcript');
                        setTranscriptSearch(t.title);
                      }}
                      className="text-xs font-mono text-text-muted hover:text-accent-amber transition-colors"
                    >
                      Jump to transcript &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 6. ENTITIES */}
        {activeTab === 'entities' && renderSectionState(ai?.entities, () => {
          const entitiesData = ai.entities.data || {};
          const categories = [
            { key: 'people', label: 'People' },
            { key: 'companies', label: 'Organizations' },
            { key: 'technologies', label: 'Technologies' },
            { key: 'products', label: 'Products' },
            { key: 'features', label: 'Features' },
            { key: 'deadlines', label: 'Deadlines' },
            { key: 'documents', label: 'Documents' },
            { key: 'locations', label: 'Locations' },
          ];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map(cat => {
                const items: string[] = entitiesData[cat.key] || [];
                if (!items || items.length === 0) return null;

                return (
                  <div key={cat.key} className="p-4 rounded-xl bg-signal-surface border border-border-hairline">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase font-bold text-accent-amber">{cat.label}</span>
                      <span className="text-xs text-text-muted font-mono">{items.length}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, i) => (
                        <span 
                          key={i} 
                          onClick={() => copyToClipboard(item, "Entity")}
                          className="px-3 py-1 rounded-md bg-signal-surface-raised border border-border-hairline hover:border-accent-amber hover:text-accent-amber text-xs font-medium text-text-secondary cursor-pointer transition-colors"
                          title="Click to copy"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 7. TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Filter transcript..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full bg-signal-surface border border-border-hairline rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent-amber"
                />
              </div>

              {speakersList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">Speaker:</span>
                  <select 
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="bg-signal-surface border border-border-hairline rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All Speakers ({speakersList.length})</option>
                    {speakersList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-2">
              {filteredSegments.length > 0 ? (
                filteredSegments.map((segment: any, idx: number) => {
                  const mins = Math.floor((segment.start || 0) / 60);
                  const secs = Math.floor((segment.start || 0) % 60);
                  const timestampStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-signal-surface border border-border-hairline hover:border-accent-amber/40 transition-colors flex items-start gap-4">
                      <span className="font-mono text-xs text-text-muted w-12 text-right shrink-0 mt-0.5">
                        {segment.timestamp || timestampStr}
                      </span>
                      <div className="flex-1">
                        <div className="mb-1">
                          <strong className="text-xs font-mono font-bold text-accent-amber">
                            {segment.speaker || 'Speaker'}
                          </strong>
                        </div>
                        <p className="text-sm text-zinc-100 leading-relaxed font-normal">{segment.text}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(segment.text, "Transcript segment")}
                        className="text-text-muted hover:text-white p-1 text-xs"
                        title="Copy"
                      >
                        copy
                      </button>
                    </div>
                  );
                })
              ) : (
                <EmptyState title="No Segments Match" description="Try clearing your search query." />
              )}
            </div>
          </div>
        )}

        {/* 8. FOLLOW-UP EMAIL */}
        {activeTab === 'email' && renderSectionState(ai?.email, () => (
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-signal-surface border border-border-hairline shadow-surface">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-hairline">
                <div>
                  <span className="text-xs font-mono text-text-muted uppercase font-bold block">Generated Subject</span>
                  <h3 className="text-base font-bold text-white mt-1">{ai.email.data.subject}</h3>
                </div>
                <button 
                  onClick={() => copyToClipboard(`Subject: ${ai.email.data.subject}\n\n${ai.email.data.body}`, "Email draft")}
                  className="px-4 py-2 rounded-lg bg-accent-amber hover:bg-accent-amber-dim text-white text-xs font-semibold transition-colors"
                >
                  Copy Full Email
                </button>
              </div>

              <div className="p-4 rounded-lg bg-signal-ink border border-border-hairline text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono">
                {ai.email.data.body}
              </div>
            </div>
          </div>
        ))}

        {/* 9. COPILOT CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[520px] bg-signal-surface border border-border-hairline rounded-xl p-5 shadow-surface">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Meeting Copilot</h3>
                <p className="text-xs text-text-muted">Chat with this transcript using local or cloud LLM</p>
              </div>
              <span className="text-xs font-mono text-accent-amber bg-accent-amber/15 border border-accent-amber/30 px-2.5 py-0.5 rounded-md font-semibold">
                Local Context
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-muted">
                  <p className="text-sm text-text-secondary mb-4">Ask questions about decisions, action items, or commitments.</p>
                  
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {[
                      "What were the key decisions?",
                      "List all commitments with deadlines",
                      "Draft a concise Slack update"
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(prompt)}
                        className="text-xs bg-signal-surface-raised hover:bg-signal-surface-elevated text-text-secondary hover:text-white px-3 py-1.5 rounded-lg border border-border-hairline transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`p-4 rounded-xl max-w-[80%] text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-accent-amber text-white font-medium shadow-sm' 
                        : 'bg-signal-surface-raised text-zinc-100 border border-border-hairline whitespace-pre-wrap'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {isChatSending && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <div className="w-4 h-4 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing transcript...</span>
                </div>
              )}
            </div>

            {/* Input Row */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2.5 pt-3 border-t border-border-hairline mt-3">
              <input 
                type="text"
                placeholder="Ask about this meeting..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatSending}
                className="flex-1 bg-signal-ink border border-border-hairline rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent-amber"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isChatSending}
                className="px-5 py-2.5 rounded-lg bg-accent-amber text-white text-sm font-semibold hover:bg-accent-amber-dim disabled:opacity-40 transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
