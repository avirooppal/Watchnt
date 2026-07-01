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
    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-sm ";
    switch (status) {
      case 'COMPLETED':
        return base + "bg-emerald-500/10 text-emerald-600";
      case 'FAILED':
        return base + "bg-red-500/10 text-red-600";
      case 'RECORDING':
        return base + "bg-tally-orange/10 text-tally-orange animate-pulse";
      default: // Processing states
        return base + "bg-black/5 text-black/60";
    }
  };

  const isProcessing = (status: string) => !['COMPLETED', 'FAILED', 'RECORDING'].includes(status);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-black/10 pb-6">
        <div>
          <h2 className="text-5xl font-serif font-bold tracking-tight text-tally-text">Library<span className="text-tally-orange">.</span></h2>
          <p className="mt-4 text-black/50 font-medium">Review your past conversations and generated insights.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-black/10 bg-black/[0.02]">
          <h3 className="text-xl font-serif font-bold text-black/40 mb-2">No meetings yet</h3>
          <p className="text-black/40 text-sm">Use the WatchNT browser extension to start capturing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {meetings.map((meeting) => (
            <Link to={`/meeting/${meeting.id}`} key={meeting.id} className="block h-full group">
              <div className="h-full flex flex-col justify-between p-6 rounded-xl bg-tally-card border-none text-white shadow-xl transition-transform duration-300 group-hover:-translate-y-1">
                
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-serif font-medium text-white/90 line-clamp-2">
                      {meeting.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusBadge(meeting.status)}>
                      {isProcessing(meeting.status) && (
                        <span className="inline-block w-1.5 h-1.5 mr-1.5 rounded-full bg-black/40 animate-ping" />
                      )}
                      {meeting.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="pt-6 mt-4 border-t border-white/10 flex items-center text-xs tracking-wider uppercase font-medium text-white/40">
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
