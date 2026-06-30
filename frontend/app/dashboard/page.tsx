'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Meeting Dashboard</h1>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + New Meeting
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : meetings.length === 0 ? (
        <p>No meetings found.</p>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="p-4 bg-white shadow rounded border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{meeting.title}</h3>
                <p className="text-gray-500 text-sm">{new Date(meeting.created_at).toLocaleString()}</p>
              </div>
              <Link href={`/dashboard/${meeting.id}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
