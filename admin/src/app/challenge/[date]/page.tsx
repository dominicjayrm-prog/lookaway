import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default async function ChallengeDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const { data: challenge } = await supabase.from('daily_challenges').select('*').eq('challenge_date', date).single();
  const { data: results } = await supabase.from('daily_results').select('*').eq('challenge_date', date);
  const playerCount = results?.length ?? 0;
  const avgScore = playerCount > 0 ? Math.round((results ?? []).reduce((a: number, r: any) => a + (r.score ?? 0), 0) / playerCount) : 0;

  if (!challenge) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900">Challenge: {date}</h1>
        <div className="mt-6 bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-slate-500">No challenge exists for this date.</p>
          <Link href={`/challenges/builder?date=${date}`} className="mt-4 inline-block bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Create one</Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = { live: 'bg-green-100 text-green-700', draft: 'bg-blue-100 text-blue-700', pending_review: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-700' };
  const scenes = challenge.scene_data?.scenes ?? challenge.scene_data?.rounds ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{date}</h1>
          <p className="mt-1 text-sm text-slate-500">Mode: {challenge.mode} | Difficulty: {challenge.difficulty}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[challenge.status] ?? 'bg-gray-100 text-gray-700'}`}>{challenge.status}</span>
      </div>

      {playerCount > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">Players</p><p className="mt-2 text-3xl font-bold text-slate-900">{playerCount}</p></div>
          <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">Avg Score</p><p className="mt-2 text-3xl font-bold text-slate-900">{avgScore}%</p></div>
          <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">Perfect Scores</p><p className="mt-2 text-3xl font-bold text-slate-900">{(results ?? []).filter((r: any) => r.score === 100).length}</p></div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Scene Data</h2>
        <p className="text-sm text-slate-500">{scenes.length} scene(s) / round(s)</p>
        <pre className="mt-4 bg-gray-50 rounded-lg p-4 text-xs text-slate-600 overflow-auto max-h-96">{JSON.stringify(challenge.scene_data, null, 2)}</pre>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href={`/challenges/builder?date=${date}`} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Edit in Builder</Link>
        <Link href="/" className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">Back to Dashboard</Link>
      </div>
    </div>
  );
}
