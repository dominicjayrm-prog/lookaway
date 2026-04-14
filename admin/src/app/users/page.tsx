import { BlinkMini } from '@/components/BlinkMini';
import { supabase } from '@/lib/supabase';
import { UsersTable } from './users-table';

export const dynamic = 'force-dynamic';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface UserRow {
  id: string;
  displayName: string;
  joined: string;
  joinedRaw: string;
  stars: number;
  gems: number;
  streak: number;
  completions: number;
  lastActive: string | null;
}

export default async function UsersPage() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, gems, streak_count, total_stars, created_at')
    .order('created_at', { ascending: false });

  // Activity from economy_events (any gem/life event = user was playing)
  const [eventsRes, progressRes] = await Promise.all([
    supabase.from('economy_events').select('user_id, created_at').order('created_at', { ascending: false }).limit(5000),
    supabase.from('user_progress').select('user_id').limit(10000),
  ]);

  const eventsByUser = new Map<string, { last: string }>();
  for (const e of eventsRes.data ?? []) {
    if (!eventsByUser.has(e.user_id) || e.created_at > eventsByUser.get(e.user_id)!.last) {
      eventsByUser.set(e.user_id, { last: e.created_at });
    }
  }

  const completionsByUser = new Map<string, number>();
  for (const p of progressRes.data ?? []) {
    completionsByUser.set(p.user_id, (completionsByUser.get(p.user_id) ?? 0) + 1);
  }

  const totalUsers = (profiles ?? []).length;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const activeToday = new Set((eventsRes.data ?? []).filter((e) => e.created_at.startsWith(today)).map((e) => e.user_id)).size;
  const activeWeek = new Set((eventsRes.data ?? []).filter((e) => e.created_at >= weekAgo).map((e) => e.user_id)).size;

  const rows: UserRow[] = (profiles ?? []).map((u: {
    id: string;
    display_name: string | null;
    gems: number | null;
    streak_count: number | null;
    total_stars: number | null;
    created_at: string;
  }) => ({
    id: u.id,
    displayName: u.display_name || 'Player',
    joined: u.created_at ? timeAgo(u.created_at) : '-',
    joinedRaw: u.created_at,
    stars: u.total_stars ?? 0,
    gems: u.gems ?? 0,
    streak: u.streak_count ?? 0,
    completions: completionsByUser.get(u.id) ?? 0,
    lastActive: eventsByUser.get(u.id)?.last ?? null,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <BlinkMini size={48} />
        <div>
          <h1 className="text-3xl font-bold text-brand-text">Users</h1>
          <p className="text-sm text-brand-textMid">Player stats and activity</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Total users" value={totalUsers} accent="brand-accent" />
        <StatCard label="Active today" value={activeToday} accent="brand-blue" />
        <StatCard label="Active this week" value={activeWeek} accent="brand-green" />
      </div>

      <UsersTable rows={rows} />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-textMid">{label}</p>
      <p className={`mt-2 text-4xl font-bold text-${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
}
