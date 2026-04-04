import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WORLDS } from '@/data/worldConfig';

export const dynamic = 'force-dynamic';

function pad(n: number) { return n.toString().padStart(2, '0'); }

export default async function DashboardPage() {
  // Fetch real stats
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalLevels } = await supabase.from('campaign_levels').select('*', { count: 'exact', head: true }).eq('status', 'complete');
  const { count: totalProgress } = await supabase.from('user_progress').select('*', { count: 'exact', head: true });
  const { data: profiles } = await supabase.from('profiles').select('gems, total_stars, highest_world');

  const totalGems = (profiles ?? []).reduce((s, p) => s + (p.gems ?? 0), 0);
  const totalStars = (profiles ?? []).reduce((s, p) => s + (p.total_stars ?? 0), 0);
  const avgWorld = profiles && profiles.length > 0
    ? (profiles.reduce((s, p) => s + (p.highest_world ?? 1), 0) / profiles.length).toFixed(1)
    : '1.0';

  // Recent activity
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  const { count: recentEvents } = await supabase.from('economy_events').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr);

  // Levels per world
  const { data: levelCounts } = await supabase.from('campaign_levels').select('world_id').eq('status', 'complete');
  const worldCounts: Record<number, number> = {};
  WORLDS.forEach(w => { worldCounts[w.id] = 0; });
  (levelCounts ?? []).forEach((l: any) => { worldCounts[l.world_id] = (worldCounts[l.world_id] || 0) + 1; });

  // Friends & challenges
  const { count: friendships } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted');
  const { count: challenges } = await supabase.from('friend_challenges').select('*', { count: 'exact', head: true });

  const statCard = (label: string, value: string | number, color: string) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">BLANKED game overview</p>

      {/* Top stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Total Players', totalUsers ?? 0, '#6C5CE7')}
        {statCard('Levels Built', `${totalLevels ?? 0} / 200`, '#0984E3')}
        {statCard('Total Stars Earned', totalStars, '#D4A012')}
        {statCard('Gems in Circulation', totalGems, '#00B894')}
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Level Completions', totalProgress ?? 0, '#E17055')}
        {statCard('Avg World Reached', avgWorld, '#FF6B6B')}
        {statCard('Friendships', friendships ?? 0, '#FD79A8')}
        {statCard('Friend Challenges', challenges ?? 0, '#F9A825')}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/levels" className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Manage Levels</Link>
        <Link href="/economy" className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700">Economy</Link>
        <Link href="/users" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Users</Link>
      </div>

      {/* World progress */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">World Progress</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {WORLDS.map(w => {
            const built = worldCounts[w.id] ?? 0;
            const target = w.levelRange[1] - w.levelRange[0] + 1;
            const pct = Math.round((built / target) * 100);
            return (
              <div key={w.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: w.color }}>W{w.id}</span>
                  <span className="text-sm font-semibold text-slate-700">{w.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: w.color }} />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{built}/{target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">This Week</h2>
        <p className="text-sm text-slate-500">{recentEvents ?? 0} economy events in the last 7 days</p>
      </div>
    </div>
  );
}
