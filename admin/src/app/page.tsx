import Link from 'next/link';
import { BlinkMini } from '@/components/BlinkMini';
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
  (levelCounts ?? []).forEach((l: { world_id: number }) => { worldCounts[l.world_id] = (worldCounts[l.world_id] || 0) + 1; });

  // Friends & player-vs-player challenges (separate from the removed daily feature)
  const { count: friendships } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted');
  const { count: friendMatches } = await supabase.from('friend_challenges').select('*', { count: 'exact', head: true });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <BlinkMini size={48} />
        <div>
          <h1 className="text-3xl font-bold text-brand-text">Dashboard</h1>
          <p className="text-sm text-brand-textMid">BLANKED game overview</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Players" value={totalUsers ?? 0} accent="brand-accent" />
        <StatCard label="Levels Built" value={`${totalLevels ?? 0} / 200`} accent="brand-blue" />
        <StatCard label="Total Stars Earned" value={totalStars} accent="brand-gold" />
        <StatCard label="Gems in Circulation" value={totalGems} accent="brand-green" />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Level Completions" value={totalProgress ?? 0} accent="brand-accent" />
        <StatCard label="Avg World Reached" value={avgWorld} accent="brand-coral" />
        <StatCard label="Friendships" value={friendships ?? 0} accent="brand-accentLight" />
        <StatCard label="Friend Matches" value={friendMatches ?? 0} accent="brand-gold" />
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QuickLink href="/analytics" label="View Analytics" />
        <QuickLink href="/levels" label="Manage Levels" />
        <QuickLink href="/economy" label="Economy" variant="secondary" />
        <QuickLink href="/users" label="Users" variant="secondary" />
      </div>

      {/* World progress */}
      <div className="mt-8 bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border">
        <h2 className="text-lg font-bold text-brand-text mb-4">World progress</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {WORLDS.map(w => {
            const built = worldCounts[w.id] ?? 0;
            const target = w.levelRange[1] - w.levelRange[0] + 1;
            const pct = Math.round((built / target) * 100);
            return (
              <div key={w.id} className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: w.color }}>W{w.id}</span>
                  <span className="text-sm font-semibold text-brand-text">{w.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-brand-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: w.color }} />
                  </div>
                  <span className="text-xs font-medium text-brand-textMid">{built}/{target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border">
        <h2 className="text-lg font-bold text-brand-text mb-1">This week</h2>
        <p className="text-sm text-brand-textMid">
          <span className="font-bold text-brand-accent">{(recentEvents ?? 0).toLocaleString()}</span> economy events in the last 7 days
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-brand-card rounded-brand shadow-brand-card p-5 border border-brand-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-textMid">{label}</p>
      <p className={`mt-1 text-3xl font-bold text-${accent}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

function QuickLink({ href, label, variant = 'primary' }: { href: string; label: string; variant?: 'primary' | 'secondary' }) {
  const cls = variant === 'primary'
    ? 'bg-brand-accent text-white hover:opacity-90'
    : 'bg-brand-card text-brand-text border border-brand-border hover:bg-brand-surface';
  return (
    <Link href={href} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${cls}`}>
      {label}
    </Link>
  );
}
