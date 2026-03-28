import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { DailyChallenge } from '@/lib/types';

export default async function ChallengesReviewPage() {
  const { data: challenges, error } = await supabase.from('daily_challenges').select('*').in('status', ['draft', 'pending_review']).order('challenge_date', { ascending: true });
  if (error) return (<div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Review Queue</h1><div className="mt-4 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 rounded-lg">Error: {error.message}</div></div>);
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
      <p className="mt-1 text-sm text-slate-500">{(challenges ?? []).length} challenge(s) pending</p>
      {(challenges ?? []).length === 0 ? (
        <div className="mt-12 text-center"><p className="text-sm text-slate-500">All caught up!</p><Link href="/challenges/builder" className="mt-4 inline-block bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Create a challenge</Link></div>
      ) : (
        <div className="mt-6 space-y-3">{(challenges ?? []).map((c: any) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div><p className="font-semibold text-slate-900">{c.challenge_date}</p><p className="text-sm text-slate-500">{c.mode} {String.fromCharCode(183)} {c.status}</p></div>
            <Link href={`/challenge/${c.challenge_date}`} className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-purple-700">Review</Link>
          </div>
        ))}</div>
      )}
    </div>
  );
}
