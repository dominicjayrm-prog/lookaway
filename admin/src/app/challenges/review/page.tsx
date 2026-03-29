import { supabase } from '@/lib/supabase';
import ReviewClient from './review-client';

export default async function ChallengesReviewPage() {
  const { data: challenges, error } = await supabase.from('daily_challenges').select('*').in('status', ['draft', 'pending_review']).order('challenge_date', { ascending: true });
  if (error) return (<div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Review Queue</h1><div className="mt-4 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 rounded-lg">Error: {error.message}</div></div>);
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
      <p className="mt-1 text-sm text-slate-500">{(challenges ?? []).length} challenge(s) pending</p>
      <ReviewClient challenges={(challenges ?? []) as any} />
    </div>
  );
}
