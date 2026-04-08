/**
 * Leaderboard system — Global + Friends rankings with divisions.
 * Divisions based on total stars earned.
 */
import { supabase } from '@/src/lib/supabase';

// ── Divisions ─────────────────────────────────────────────────────────
export interface Division {
  id: string;
  name: string;
  color: string;
  icon: string;
  minStars: number;
}

export const DIVISIONS: Division[] = [
  { id: 'bronze', name: 'Bronze', color: '#CD7F32', icon: '\u{1F949}', minStars: 0 },
  { id: 'silver', name: 'Silver', color: '#C0C0C0', icon: '\u{1F948}', minStars: 50 },
  { id: 'gold', name: 'Gold', color: '#D4A012', icon: '\u{1F947}', minStars: 150 },
  { id: 'platinum', name: 'Platinum', color: '#0984E3', icon: '\u{1F48E}', minStars: 300 },
  { id: 'diamond', name: 'Diamond', color: '#6C5CE7', icon: '\u2B50', minStars: 500 },
  { id: 'master', name: 'Master', color: '#FF6B6B', icon: '\u{1F451}', minStars: 800 },
];

export function getDivision(totalStars: number): Division {
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (totalStars >= DIVISIONS[i].minStars) return DIVISIONS[i];
  }
  return DIVISIONS[0];
}

export function getNextDivision(totalStars: number): Division | null {
  const current = getDivision(totalStars);
  const idx = DIVISIONS.findIndex(d => d.id === current.id);
  return idx < DIVISIONS.length - 1 ? DIVISIONS[idx + 1] : null;
}

// ── Leaderboard entry ─────────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_color: string;
  total_stars: number;
  highest_world: number;
  division: Division;
  rank: number;
  avatar_url?: string | null;
  equipped_frame?: string | null;
  equipped_expression?: string | null;
}

// ── Global leaderboard ───────────────────────────────────────────────
export async function getGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_color, total_stars, highest_world, avatar_url, equipped_frame, equipped_expression')
    .not('username', 'is', null)
    .order('total_stars', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    id: row.id,
    username: row.username ?? 'player',
    avatar_color: row.avatar_color ?? '#6C5CE7',
    total_stars: row.total_stars ?? 0,
    highest_world: row.highest_world ?? 1,
    division: getDivision(row.total_stars ?? 0),
    rank: i + 1,
  }));
}

// ── Friends leaderboard ──────────────────────────────────────────────
export async function getFriendsLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  // Get friend IDs
  const { data: friendships, error: fErr } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (fErr || !friendships) return [];

  const friendIds = friendships.map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
  // Include self
  friendIds.push(userId);

  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_color, total_stars, highest_world, avatar_url, equipped_frame, equipped_expression')
    .in('id', friendIds)
    .order('total_stars', { ascending: false });

  if (error || !data) return [];

  return data.map((row, i) => ({
    id: row.id,
    username: row.username ?? 'player',
    avatar_color: row.avatar_color ?? '#6C5CE7',
    total_stars: row.total_stars ?? 0,
    highest_world: row.highest_world ?? 1,
    division: getDivision(row.total_stars ?? 0),
    rank: i + 1,
  }));
}

// ── My rank on global leaderboard ────────────────────────────────────
export async function getMyGlobalRank(userId: string): Promise<number | null> {
  const { data: me } = await supabase
    .from('profiles')
    .select('total_stars')
    .eq('id', userId)
    .single();

  if (!me) return null;

  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('total_stars', me.total_stars ?? 0)
    .not('username', 'is', null);

  if (error || count === null) return null;
  return count + 1;
}
