/**
 * Leaderboard system — Global + Friends rankings with divisions.
 * Divisions based on total stars earned.
 */
import { supabase } from '@/src/lib/supabase';
import { t } from '@/src/i18n';
import { TOTAL_POSITIONS } from '@/src/data/unifiedJourney';

// ── Divisions ─────────────────────────────────────────────────────────
export interface Division {
  id: string;
  /** Localised display name. Resolved at access time via a getter so
   *  the UI picks up the active locale without needing to recompute
   *  leaderboard entries after a language toggle. */
  readonly name: string;
  color: string;
  icon: string;
  minStars: number;
}

interface DivisionSeed {
  id: string;
  nameKey: string;
  color: string;
  icon: string;
  minStars: number;
}

const DIVISION_SEEDS: DivisionSeed[] = [
  { id: 'bronze',   nameKey: 'social.division_bronze',   color: '#CD7F32', icon: '\u{1F949}', minStars: 0 },
  { id: 'silver',   nameKey: 'social.division_silver',   color: '#C0C0C0', icon: '\u{1F948}', minStars: 50 },
  { id: 'gold',     nameKey: 'social.division_gold',     color: '#D4A012', icon: '\u{1F947}', minStars: 150 },
  { id: 'platinum', nameKey: 'social.division_platinum', color: '#0984E3', icon: '\u{1F48E}', minStars: 300 },
  { id: 'diamond',  nameKey: 'social.division_diamond',  color: '#6C5CE7', icon: '\u2B50',    minStars: 500 },
  { id: 'master',   nameKey: 'social.division_master',   color: '#FF6B6B', icon: '\u{1F451}', minStars: 800 },
];

export const DIVISIONS: Division[] = DIVISION_SEEDS.map(seed => {
  const div = { id: seed.id, color: seed.color, icon: seed.icon, minStars: seed.minStars } as Division;
  Object.defineProperty(div, 'name', { get: () => t(seed.nameKey), enumerable: true });
  return div;
});

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
  /** @deprecated Use unified_position. Kept for backwards compatibility
   *  while older cloud rows haven't written the new column yet. */
  highest_world: number;
  /** Position 1-380 on the Unified Brain Journey. This is what friend
   *  cards and leaderboard rows should display ("Level 108" instead
   *  of "World 2 Level 8"). */
  unified_position: number;
  division: Division;
  rank: number;
  avatar_url?: string | null;
  equipped_frame?: string | null;
  equipped_expression?: string | null;
}

const LEADERBOARD_COLUMNS =
  'id, username, avatar_color, total_stars, highest_world, unified_position, avatar_url, equipped_frame, equipped_expression';

// ── Global leaderboard ───────────────────────────────────────────────
// `total_stars > 0` filter keeps the global board clean: brand-new
// accounts (test devices, churned signups, cancelled trials) all sit
// at 0 stars and were diluting the board with rows nobody wants to
// see. Ranking still feels honest because the user only enters the
// board the moment they earn their first star, which mirrors how
// every competitive game works.
export async function getGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(LEADERBOARD_COLUMNS)
    .not('username', 'is', null)
    .gt('total_stars', 0)
    .order('total_stars', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    id: row.id,
    username: row.username ?? 'player',
    avatar_color: row.avatar_color ?? '#6C5CE7',
    total_stars: row.total_stars ?? 0,
    highest_world: row.highest_world ?? 1,
    unified_position: Math.min(TOTAL_POSITIONS, Math.max(1, row.unified_position ?? 1)),
    division: getDivision(row.total_stars ?? 0),
    rank: i + 1,
    avatar_url: row.avatar_url ?? null,
    equipped_frame: row.equipped_frame ?? null,
    equipped_expression: row.equipped_expression ?? null,
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
    .select(LEADERBOARD_COLUMNS)
    .in('id', friendIds)
    .order('total_stars', { ascending: false });

  if (error || !data) return [];

  return data.map((row, i) => ({
    id: row.id,
    username: row.username ?? 'player',
    avatar_color: row.avatar_color ?? '#6C5CE7',
    total_stars: row.total_stars ?? 0,
    highest_world: row.highest_world ?? 1,
    unified_position: Math.min(TOTAL_POSITIONS, Math.max(1, row.unified_position ?? 1)),
    division: getDivision(row.total_stars ?? 0),
    rank: i + 1,
    avatar_url: row.avatar_url ?? null,
    equipped_frame: row.equipped_frame ?? null,
    equipped_expression: row.equipped_expression ?? null,
  }));
}

// ── My rank on global leaderboard ────────────────────────────────────
// Mirrors the same `total_stars > 0` filter as `getGlobalLeaderboard`
// so the rank count matches what the user sees on screen. Without
// this, a user with 5 stars could be told "rank 1247" while the
// visible board only has ~200 ranked entries because the count
// included thousands of 0-star ghost accounts.
export async function getMyGlobalRank(userId: string): Promise<number | null> {
  const { data: me } = await supabase
    .from('profiles')
    .select('total_stars')
    .eq('id', userId)
    .single();

  if (!me) return null;
  // Users with 0 stars aren't on the board at all (they haven't
  // earned an entry yet), so we don't compute a rank for them.
  if ((me.total_stars ?? 0) <= 0) return null;

  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('total_stars', me.total_stars ?? 0)
    .not('username', 'is', null);

  if (error || count === null) return null;
  return count + 1;
}
