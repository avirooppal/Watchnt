import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'transcript' | 'email'>('summary');

  useEffect(() => {
    const apiUrl = 'http://localhost:8000';
    fetch(`${apiUrl}/meeting/${id}`)
      .then(res => res.json())
      .then(resData => setData(resData))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tally-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20 text-red-600">
        <h2 className="text-2xl font-serif font-bold">Meeting not found</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-tally-orange hover:underline font-medium">
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
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex items-center gap-6 border-b border-black/10 pb-6">
        <button 
          onClick={() => navigate('/')}
          className="p-2 rounded-full hover:bg-black/5 transition-colors text-black/60"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-4xl font-serif font-bold tracking-tight text-tally-text">{metadata?.title || 'Meeting Detail'}</h2>
          <p className="text-black/50 mt-2 font-medium">
            {metadata?.created_at ? new Date(metadata.created_at).toLocaleString() : 'Unknown Date'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-tally-card text-white shadow-lg' 
                : 'text-black/60 hover:text-black hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-xl border border-black/5 min-h-[500px]">
        {activeTab === 'summary' && (
          <div className="prose prose-lg max-w-none text-black/80 prose-headings:font-serif prose-headings:text-tally-text">
            {summary ? (
              <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-black/40 italic">No summary available yet.</p>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            {!actions || actions.length === 0 ? (
              <p className="text-black/40 italic">No action items extracted.</p>
            ) : typeof actions === 'string' ? (
              <p className="text-black/80">{actions}</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {actions.map((action: any, i: number) => (
                  <div key={i} className="p-6 rounded-2xl bg-tally-card text-white flex flex-col gap-4 shadow-xl">
                    <div className="flex justify-between items-start gap-4">
                      <span className="font-medium text-lg leading-snug">{action.task}</span>
                      {action.priority && (
                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                          action.priority.toLowerCase() === 'high' ? 'bg-red-500/20 text-red-400' :
                          action.priority.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {action.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm font-medium text-white/50 border-t border-white/10 pt-4">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {action.owner}
                      </span>
                      {action.deadline && action.deadline.toLowerCase() !== 'none' && (
                        <span className="flex items-center gap-1.5 text-tally-orange">
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
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
            {!transcript || !transcript.segments ? (
              <p className="text-black/40 italic">No transcript available.</p>
            ) : (
              transcript.segments.map((segment: any, i: number) => (
                <div key={i} className="flex gap-6 group">
                  <div className="w-16 shrink-0 text-right text-xs font-bold text-black/30 pt-1">
                    {Math.floor(segment.start / 60)}:{(Math.floor(segment.start % 60)).toString().padStart(2, '0')}
                  </div>
                  <div className="text-black/80 text-lg leading-relaxed">
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
              <div dangerouslySetInnerHTML={{ __html: email }} className="prose prose-lg max-w-none text-black/80" />
            ) : (
              <p className="text-black/40 italic">Email draft not generated yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
