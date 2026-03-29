'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Challenge { id: string; challenge_date: string; mode: string; status: string; difficulty: string; }

export default function ReviewClient({ challenges: initial }: { challenges: Challenge[] }) {
  const [challenges, setChallenges] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (date: string) => {
    if (!confirm(`Delete challenge for ${date}? This cannot be undone.`)) return;
    setDeleting(date);
    try {
      const res = await fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dates: [date], status: 'archived' }) });
      if (res.ok) setChallenges(prev => prev.filter(c => c.challenge_date !== date));
    } catch {} finally { setDeleting(null); }
  };

  const handleApprove = async (date: string) => {
    try {
      const res = await fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dates: [date], status: 'live' }) });
      if (res.ok) setChallenges(prev => prev.map(c => c.challenge_date === date ? { ...c, status: 'live' } : c).filter(c => c.status !== 'live'));
    } catch {}
  };

  if (challenges.length === 0) return (
    <div className="mt-12 text-center"><p className="text-sm text-slate-500">All caught up!</p><Link href="/challenges/builder" className="mt-4 inline-block bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Create a challenge</Link></div>
  );

  return (
    <div className="mt-6 space-y-3">
      {challenges.map(c => (
        <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">{c.challenge_date}</p>
            <p className="text-sm text-slate-500">{c.mode} {String.fromCharCode(183)} {c.status} {String.fromCharCode(183)} {c.difficulty || 'medium'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleApprove(c.challenge_date)} className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-green-700">Approve</button>
            <Link href={`/challenge/${c.challenge_date}`} className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-purple-700">Review</Link>
            <button onClick={() => handleDelete(c.challenge_date)} disabled={deleting === c.challenge_date} className="bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-100 disabled:opacity-50">{deleting === c.challenge_date ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
