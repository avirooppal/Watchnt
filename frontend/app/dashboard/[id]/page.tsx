'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function MeetingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'transcript' | 'email'>('summary');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/meeting/${id}`)
      .then(res => res.json())
      .then(resData => setData(resData))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20 text-red-400">
        <h2 className="text-xl">Meeting not found</h2>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-indigo-400 hover:text-indigo-300">
          Return to Dashboard
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-slate-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{metadata?.title || 'Meeting Detail'}</h2>
          <p className="text-sm text-slate-400 mt-1">
            {metadata?.created_at ? new Date(metadata.created_at).toLocaleString() : 'Unknown Date'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-900/50 backdrop-blur border border-white/5 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 min-h-[500px]">
        {activeTab === 'summary' && (
          <div className="prose prose-invert prose-indigo max-w-none">
            {summary ? (
              <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-slate-500">No summary available yet.</p>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {!actions || actions.length === 0 ? (
              <p className="text-slate-500">No action items extracted.</p>
            ) : typeof actions === 'string' ? (
              <p className="text-slate-300">{actions}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {actions.map((action: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-white">{action.task}</span>
                      {action.priority && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          action.priority.toLowerCase() === 'high' ? 'bg-red-500/10 text-red-400' :
                          action.priority.toLowerCase() === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {action.owner}
                      </span>
                      {action.deadline && action.deadline.toLowerCase() !== 'none' && (
                        <span className="flex items-center gap-1 text-rose-400/80">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {!transcript || !transcript.segments ? (
              <p className="text-slate-500">No transcript available.</p>
            ) : (
              transcript.segments.map((segment: any, i: number) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-24 shrink-0 text-right text-xs font-medium text-slate-500 pt-1 group-hover:text-indigo-400 transition-colors">
                    {Math.floor(segment.start / 60)}:{(Math.floor(segment.start % 60)).toString().padStart(2, '0')}
                  </div>
                  <div className="text-slate-300 group-hover:text-white transition-colors">
                    {segment.text}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'email' && (
          <div className="bg-white rounded-lg p-6 shadow-xl">
            {email ? (
              <div dangerouslySetInnerHTML={{ __html: email }} className="prose max-w-none" />
            ) : (
              <p className="text-slate-500">Email draft not generated yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
