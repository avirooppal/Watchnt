import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Meeting } from '../../../shared/types/meeting';

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const apiUrl = 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/meetings`);
        const data = await res.json();
        // Sort newest first
        setMeetings(data.sort((a: Meeting, b: Meeting) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMeetings();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-1 text-xs font-medium rounded-full ring-1 ring-inset ";
    switch (status) {
      case 'COMPLETED':
        return base + "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
      case 'FAILED':
        return base + "bg-red-500/10 text-red-400 ring-red-500/20";
      case 'RECORDING':
        return base + "bg-rose-500/10 text-rose-400 ring-rose-500/20 animate-pulse";
      default: // Processing states
        return base + "bg-blue-500/10 text-blue-400 ring-blue-500/20";
    }
  };

  const isProcessing = (status: string) => !['COMPLETED', 'FAILED', 'RECORDING'].includes(status);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Meeting Library</h2>
        <p className="mt-2 text-slate-400">Review your past conversations and generated insights.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No meetings yet</h3>
          <p className="text-slate-400 max-w-sm">Use the WatchNT browser extension to start capturing your first meeting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <Link to={`/meeting/${meeting.id}`} key={meeting.id} className="block h-full">
              <div className="group relative h-full flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden">
                
                {/* Glassmorphism gradient effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-medium text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
                      {meeting.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusBadge(meeting.status)}>
                      {isProcessing(meeting.status) && (
                        <span className="inline-block w-2 h-2 mr-1.5 rounded-full bg-blue-400 animate-ping" />
                      )}
                      {meeting.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="relative z-10 pt-6 mt-4 border-t border-white/5 flex items-center text-sm text-slate-500">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(meeting.created_at).toLocaleDateString(undefined, { 
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
