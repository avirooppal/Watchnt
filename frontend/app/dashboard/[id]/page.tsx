'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MeetingDetail() {
  const params = useParams();
  const meetingId = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/meeting/${meetingId}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [meetingId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Meeting not found.</div>;

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto font-sans text-gray-800">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline">&larr; Back to Dashboard</Link>
      </div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{data.metadata?.title || 'Meeting'}</h1>
          <p className="text-gray-500">
            {data.metadata?.created_at ? new Date(data.metadata.created_at).toLocaleString() : ''}
          </p>
        </div>
        <button 
          onClick={() => setShowEmailModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          Email Summary
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Summary */}
          {data.summary && (
            <div className="bg-white p-6 rounded shadow border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">Summary</h2>
              <div className="whitespace-pre-wrap">{data.summary}</div>
            </div>
          )}
          
          {/* Transcript */}
          {data.transcript?.segments && (
            <div className="bg-white p-6 rounded shadow border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">Transcript</h2>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {data.transcript.segments.map((seg: any, idx: number) => (
                  <p key={idx}>
                    <span className="text-gray-400 text-sm mr-2">[{seg.start.toFixed(1)}s]</span>
                    {seg.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Actions */}
          {data.actions && data.actions.length > 0 && (
            <div className="bg-white p-6 rounded shadow border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">Action Items</h2>
              <ul className="space-y-4">
                {data.actions.map((action: any, idx: number) => {
                  if (typeof action === 'string') {
                    // Backwards compatibility for old flat strings
                    return <li key={idx} className="flex gap-2"><span>&bull;</span><span>{action}</span></li>;
                  }
                  
                  // New structured format
                  return (
                    <li key={idx} className="p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                      <div className="font-semibold mb-1">{action.task}</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600 mt-2">
                        <div><span className="text-gray-400">Owner:</span> {action.owner}</div>
                        <div><span className="text-gray-400">Due:</span> {action.deadline}</div>
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          action.priority === 'High' ? 'bg-red-100 text-red-700' :
                          action.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
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

      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Send Email</h2>
            <p className="mb-4 text-gray-600">The meeting summary and action items will be sent via SMTP.</p>
            <input type="email" placeholder="recipient@example.com" className="w-full p-2 border rounded mb-4" id="emailInput" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Cancel</button>
              <button onClick={async () => {
                const email = (document.getElementById('emailInput') as HTMLInputElement).value;
                if (!email) return;
                try {
                  await fetch(`http://localhost:8000/email/${meetingId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to_email: email })
                  });
                  alert('Email sent successfully!');
                  setShowEmailModal(false);
                } catch (e) {
                  alert('Error sending email');
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
