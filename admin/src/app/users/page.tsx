import { supabase } from '@/lib/supabase';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function UsersPage() {
  // Get users from auth.users via profiles table
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, gems, lives, streak_count, total_stars, created_at').order('created_at', { ascending: false });

  // Get daily results for activity stats
  const { data: results } = await supabase.from('daily_results').select('user_id, score, completed_at').order('completed_at', { ascending: false }).limit(100);

  // Aggregate user activity from results
  const userActivity: Record<string, { lastActive: string; completions: number; avgScore: number; scores: number[] }> = {};
  for (const r of (results ?? [])) {
    if (!userActivity[r.user_id]) userActivity[r.user_id] = { lastActive: r.completed_at, completions: 0, avgScore: 0, scores: [] };
    userActivity[r.user_id].completions++;
    userActivity[r.user_id].scores.push(r.score);
    if (r.completed_at > userActivity[r.user_id].lastActive) userActivity[r.user_id].lastActive = r.completed_at;
  }
  for (const uid of Object.keys(userActivity)) {
    const scores = userActivity[uid].scores;
    userActivity[uid].avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  const totalUsers = (profiles ?? []).length;
  const today = new Date().toISOString().split('T')[0];
  const activeToday = new Set((results ?? []).filter(r => r.completed_at?.startsWith(today)).map(r => r.user_id)).size;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const activeWeek = new Set((results ?? []).filter(r => r.completed_at >= weekAgo).map(r => r.user_id)).size;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">Player stats and activity</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-purple-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Today</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeToday}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-green-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active This Week</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeWeek}</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold text-slate-500">User</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Email / ID</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Joined</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Stars</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Gems</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Streak</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Activity</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).length === 0 ? (
              <tr><td className="px-6 py-12 text-center text-slate-400" colSpan={7}>No users yet. Players will appear here after signing up.</td></tr>
            ) : (
              (profiles ?? []).map((user: any) => {
                const activity = userActivity[user.id];
                return (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.display_name || 'Player'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{user.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-slate-500">{user.created_at ? timeAgo(user.created_at) : '-'}</td>
                    <td className="px-6 py-4"><span className="text-yellow-600 font-semibold">{user.total_stars ?? 0}</span></td>
                    <td className="px-6 py-4"><span className="text-purple-600 font-semibold">{user.gems ?? 0}</span></td>
                    <td className="px-6 py-4"><span className="text-orange-600 font-semibold">{user.streak_count ?? 0}</span></td>
                    <td className="px-6 py-4 text-slate-500">{activity ? `${activity.completions} plays, avg ${activity.avgScore}%` : 'No activity'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
