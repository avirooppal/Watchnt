import { useEffect, useState } from 'react';

export default function DashboardApp() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:8000/meetings')
      .then(res => res.json())
      .then(data => {
        setMeetings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const viewDetails = (id: string) => {
    setSelectedMeetingId(id);
    fetch(`http://localhost:8000/meeting/${id}`)
      .then(res => res.json())
      .then(data => setMeetingDetails(data))
      .catch(console.error);
  };

  const backToList = () => {
    setSelectedMeetingId(null);
    setMeetingDetails(null);
  };

  if (selectedMeetingId && meetingDetails) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
          <button onClick={backToList} className="group flex items-center text-indigo-400 hover:text-indigo-300 transition-colors mb-6 text-sm font-medium">
            <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Dashboard
          </button>
          
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
              {meetingDetails.metadata?.title || 'Meeting Details'}
            </h1>
            <p className="text-slate-400 font-medium">
              {meetingDetails.metadata?.created_at ? new Date(meetingDetails.metadata.created_at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {meetingDetails.summary && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                  <h2 className="text-xl font-bold mb-4 flex items-center text-slate-200">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3">✨</span>
                    AI Summary
                  </h2>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{meetingDetails.summary}</div>
                </div>
              )}
              
              {meetingDetails.transcript?.segments && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                  <h2 className="text-xl font-bold mb-4 flex items-center text-slate-200">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mr-3">📝</span>
                    Transcript
                  </h2>
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {meetingDetails.transcript.segments.map((seg: any, idx: number) => (
                      <p key={idx} className="text-slate-300 leading-relaxed">
                        <span className="text-slate-500 text-xs font-mono mr-3 select-none">[{seg.start.toFixed(1)}s]</span>
                        {seg.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              {meetingDetails.actions && meetingDetails.actions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl sticky top-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center text-slate-200">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3">⚡</span>
                    Action Items
                  </h2>
                  <ul className="space-y-4">
                    {meetingDetails.actions.map((action: any, idx: number) => {
                      if (typeof action === 'string') {
                        return <li key={idx} className="flex text-slate-300"><span className="text-indigo-400 mr-2">&bull;</span>{action}</li>;
                      }
                      
                      return (
                        <li key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                          <div className="font-semibold text-slate-200 mb-3">{action.task}</div>
                          <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center text-slate-400">
                              <span className="w-16">Owner:</span>
                              <span className="text-slate-200 bg-white/10 px-2 py-0.5 rounded text-xs">{action.owner}</span>
                            </div>
                            <div className="flex items-center text-slate-400">
                              <span className="w-16">Due:</span>
                              <span className="text-slate-200">{action.deadline}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                              action.priority === 'High' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              action.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {action.priority}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 mb-12">
          Meeting Dashboard
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-xl text-slate-400">No meetings recorded yet.</p>
            <p className="text-sm text-slate-500 mt-2">Your captured meetings will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="group p-6 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer shadow-lg hover:shadow-indigo-500/10"
                onClick={() => viewDetails(meeting.id)}
              >
                <div className="mb-4 sm:mb-0">
                  <h3 className="text-xl font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{meeting.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{new Date(meeting.created_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                </div>
                <button 
                  className="px-5 py-2.5 bg-indigo-500/20 text-indigo-300 font-semibold rounded-xl hover:bg-indigo-500/30 hover:text-indigo-200 transition-all transform group-hover:scale-105 active:scale-95 border border-indigo-500/30"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
