/**
 * Analytics data layer for the admin panel.
 *
 * Every query is server-side (service-role key) and read-only. Each
 * helper returns a typed, chart-ready shape so the Analytics page can
 * drop the results straight into recharts components.
 *
 * Source tables (existing — no new schema):
 *   - profiles            (user metadata, gems, streak_count, memory_score_avg, created_at)
 *   - economy_events      (authoritative activity signal — one row per gem earn/spend/life event)
 *   - user_progress       (per-level completion rows with stars + best_score)
 *   - campaign_levels     (level metadata for title lookup)
 */
import { supabase } from './supabase';

// ─── Shared helpers ─────────────────────────────────────────────────

/** Format a Date → YYYY-MM-DD in UTC. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Return the date N days ago at UTC midnight. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── 1. Active users (DAU / WAU / MAU) ──────────────────────────────

export interface ActiveUsersSnapshot {
  dau: number;   // distinct users active in the last 24h
  wau: number;   // distinct users active in the last 7d
  mau: number;   // distinct users active in the last 30d
  dauPrev: number; // yesterday — for trend arrow
}

export async function getActiveUsersSnapshot(): Promise<ActiveUsersSnapshot> {
  const now = new Date();
  const [day1, day2, day7, day30] = [1, 2, 7, 30].map(daysAgo);

  // Pull a single slice covering the longest window, then bucket locally —
  // one round trip instead of four.
  const { data, error } = await supabase
    .from('economy_events')
    .select('user_id, created_at')
    .gte('created_at', day30.toISOString())
    .lte('created_at', now.toISOString());

  if (error || !data) return { dau: 0, wau: 0, mau: 0, dauPrev: 0 };

  const today = new Set<string>();
  const yest = new Set<string>();
  const week = new Set<string>();
  const month = new Set<string>();

  for (const row of data) {
    const ts = new Date(row.created_at);
    if (ts >= day30) month.add(row.user_id);
    if (ts >= day7) week.add(row.user_id);
    if (ts >= day1) today.add(row.user_id);
    if (ts >= day2 && ts < day1) yest.add(row.user_id);
  }

  return { dau: today.size, wau: week.size, mau: month.size, dauPrev: yest.size };
}

// ─── 2. Active users over time (for line chart) ─────────────────────

export interface ActivityDataPoint {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export async function getActivityTimeseries(days = 30): Promise<ActivityDataPoint[]> {
  // Pull 60 days so the 30-day rolling window on the leftmost points
  // is still computable.
  const start = daysAgo(days + 30);
  const { data, error } = await supabase
    .from('economy_events')
    .select('user_id, created_at')
    .gte('created_at', start.toISOString());

  if (error || !data) return [];

  // Bucket rows by their calendar day.
  const byDay = new Map<string, Set<string>>();
  for (const row of data) {
    const k = row.created_at.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, new Set());
    byDay.get(k)!.add(row.user_id);
  }

  // Walk the last `days` days and compute rolling DAU/WAU/MAU.
  const out: ActivityDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const k = dayKey(d);
    const dau = byDay.get(k)?.size ?? 0;

    const wau = new Set<string>();
    const mau = new Set<string>();
    for (let j = 0; j < 30; j++) {
      const bk = dayKey(daysAgo(i + j));
      const bucket = byDay.get(bk);
      if (!bucket) continue;
      if (j < 7) bucket.forEach((u) => wau.add(u));
      bucket.forEach((u) => mau.add(u));
    }

    out.push({ date: k, dau, wau: wau.size, mau: mau.size });
  }
  return out;
}

// ─── 3. Signups cohort ──────────────────────────────────────────────

export interface SignupDataPoint {
  date: string;
  count: number;
}

export async function getSignupsTimeseries(days = 30): Promise<SignupDataPoint[]> {
  const start = daysAgo(days);
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', start.toISOString());

  if (error || !data) return [];

  const byDay = new Map<string, number>();
  for (const row of data) {
    const k = row.created_at.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const out: SignupDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(daysAgo(i));
    out.push({ date: k, count: byDay.get(k) ?? 0 });
  }
  return out;
}

/** Count of profiles created today (midnight UTC onward). */
export async function getSignupsToday(): Promise<{ today: number; yesterday: number }> {
  const [day1, day2] = [1, 2].map(daysAgo);
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', day2.toISOString());

  if (error || !data) return { today: 0, yesterday: 0 };

  let today = 0;
  let yest = 0;
  for (const row of data) {
    const ts = new Date(row.created_at);
    if (ts >= day1) today++;
    else if (ts >= day2) yest++;
  }
  return { today, yesterday: yest };
}

// ─── 4. Retention (D1 / D7 / D30 per weekly cohort) ─────────────────

export interface RetentionRow {
  cohortWeek: string; // YYYY-MM-DD of the Monday the cohort started
  size: number;
  d1: number;         // % (0-100)
  d7: number;
  d30: number;
}

export async function getRetentionMatrix(weeks = 8): Promise<RetentionRow[]> {
  // Look 1 week further back than weeks so the newest cohort has d7 data.
  const start = daysAgo(weeks * 7 + 30);
  const [profilesRes, eventsRes] = await Promise.all([
    supabase.from('profiles').select('id, created_at').gte('created_at', start.toISOString()),
    supabase.from('economy_events').select('user_id, created_at').gte('created_at', start.toISOString()),
  ]);

  if (profilesRes.error || eventsRes.error) return [];
  const profiles = profilesRes.data ?? [];
  const events = eventsRes.data ?? [];

  // Map user_id → Set<day> they were active.
  const activeDays = new Map<string, Set<string>>();
  for (const e of events) {
    const k = e.created_at.slice(0, 10);
    if (!activeDays.has(e.user_id)) activeDays.set(e.user_id, new Set());
    activeDays.get(e.user_id)!.add(k);
  }

  const rows: RetentionRow[] = [];
  for (let w = 0; w < weeks; w++) {
    const cohortStart = daysAgo((w + 1) * 7);
    const cohortEnd = daysAgo(w * 7);
    const cohortUsers = profiles.filter(
      (p) => new Date(p.created_at) >= cohortStart && new Date(p.created_at) < cohortEnd,
    );
    if (cohortUsers.length === 0) {
      rows.push({ cohortWeek: dayKey(cohortStart), size: 0, d1: 0, d7: 0, d30: 0 });
      continue;
    }

    let d1 = 0, d7 = 0, d30 = 0;
    for (const u of cohortUsers) {
      const install = new Date(u.created_at);
      const day1Key = dayKey(new Date(install.getTime() + 86400000));
      const day7Key = dayKey(new Date(install.getTime() + 7 * 86400000));
      const day30Key = dayKey(new Date(install.getTime() + 30 * 86400000));
      const active = activeDays.get(u.id);
      if (!active) continue;
      if (active.has(day1Key)) d1++;
      if (active.has(day7Key)) d7++;
      if (active.has(day30Key)) d30++;
    }

    rows.push({
      cohortWeek: dayKey(cohortStart),
      size: cohortUsers.length,
      d1: Math.round((d1 / cohortUsers.length) * 100),
      d7: Math.round((d7 / cohortUsers.length) * 100),
      d30: Math.round((d30 / cohortUsers.length) * 100),
    });
  }
  return rows;
}

// ─── 5. Level completion funnel ─────────────────────────────────────

export interface FunnelDataPoint {
  world: number;
  reached: number;    // distinct users who completed ≥1 level in this world
  pctOfTotal: number; // of all users who have any progress
}

export async function getLevelFunnel(): Promise<FunnelDataPoint[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('user_id, level_id');

  if (error || !data) return [];

  const byWorld = new Map<number, Set<string>>();
  const allUsers = new Set<string>();
  for (const row of data) {
    const match = /^w(\d+)-/.exec(row.level_id ?? '');
    if (!match) continue;
    const w = Number(match[1]);
    if (!byWorld.has(w)) byWorld.set(w, new Set());
    byWorld.get(w)!.add(row.user_id);
    allUsers.add(row.user_id);
  }

  const total = allUsers.size || 1;
  const worlds = [1, 2, 3, 4, 5, 6];
  return worlds.map((w) => {
    const reached = byWorld.get(w)?.size ?? 0;
    return { world: w, reached, pctOfTotal: Math.round((reached / total) * 100) };
  });
}

// ─── 6. Memory score distribution ───────────────────────────────────

export interface ScoreBucket {
  range: string;  // e.g. "70-79"
  count: number;
}

export async function getMemoryScoreDistribution(): Promise<ScoreBucket[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('memory_score_avg')
    .not('memory_score_avg', 'is', null);

  if (error || !data) return [];

  const buckets: number[] = new Array(10).fill(0); // 0-9, 10-19, …, 90-100
  for (const row of data) {
    const score = Math.max(0, Math.min(100, Math.round(Number(row.memory_score_avg) || 0)));
    const idx = score === 100 ? 9 : Math.floor(score / 10);
    buckets[idx]++;
  }

  return buckets.map((count, i) => ({
    range: i === 9 ? '90-100' : `${i * 10}-${i * 10 + 9}`,
    count,
  }));
}

// ─── 7. Gem flow over time (earn vs spend stacked) ──────────────────

export interface GemFlowDataPoint {
  date: string;
  earn: number;   // positive gems awarded to players (across all event types)
  spend: number;  // absolute spend (stored negative in DB, displayed positive)
  net: number;
}

const EARN_TYPES = new Set([
  'gem_earn_level',
  'gem_earn_daily',
  'gem_earn_streak',
  'gem_earn_ad',
  'iap_gems',
]);
const SPEND_TYPES = new Set(['gem_spend_powerup', 'gem_spend_lives']);

export async function getGemFlowTimeseries(days = 30): Promise<GemFlowDataPoint[]> {
  const start = daysAgo(days);
  const { data, error } = await supabase
    .from('economy_events')
    .select('event_type, amount, created_at')
    .gte('created_at', start.toISOString());

  if (error || !data) return [];

  const byDay = new Map<string, { earn: number; spend: number }>();
  for (const row of data) {
    const k = row.created_at.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, { earn: 0, spend: 0 });
    const bucket = byDay.get(k)!;
    const amt = Math.abs(Number(row.amount) || 0);
    if (EARN_TYPES.has(row.event_type)) bucket.earn += amt;
    else if (SPEND_TYPES.has(row.event_type)) bucket.spend += amt;
  }

  const out: GemFlowDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(daysAgo(i));
    const v = byDay.get(k) ?? { earn: 0, spend: 0 };
    out.push({ date: k, earn: v.earn, spend: v.spend, net: v.earn - v.spend });
  }
  return out;
}

// ─── 8. Hot/cold levels (hardest + easiest) ─────────────────────────

export interface LevelStatsRow {
  levelId: string;
  title: string | null;
  attempts: number;
  completions: number;
  passRate: number; // 0-100
}

export async function getHotColdLevels(limit = 10): Promise<{ hardest: LevelStatsRow[]; easiest: LevelStatsRow[] }> {
  const [progressRes, levelsRes] = await Promise.all([
    supabase.from('user_progress').select('level_id, stars, attempts'),
    supabase.from('campaign_levels').select('id, title'),
  ]);

  if (progressRes.error || !progressRes.data) return { hardest: [], easiest: [] };

  // Note: user_progress is per-user-per-level, so "attempts" is summed across users
  // and a star count > 0 counts as a completion.
  const agg = new Map<string, { attempts: number; completions: number }>();
  for (const row of progressRes.data) {
    const id = row.level_id;
    if (!id) continue;
    if (!agg.has(id)) agg.set(id, { attempts: 0, completions: 0 });
    const a = agg.get(id)!;
    a.attempts += Number(row.attempts) || 1;
    if ((Number(row.stars) || 0) > 0) a.completions += 1;
  }

  const titles = new Map<string, string>();
  for (const l of levelsRes.data ?? []) titles.set(l.id, l.title ?? l.id);

  const rows: LevelStatsRow[] = [];
  for (const [levelId, a] of agg.entries()) {
    if (a.attempts < 3) continue; // Filter noise — need at least 3 attempts to be meaningful
    rows.push({
      levelId,
      title: titles.get(levelId) ?? null,
      attempts: a.attempts,
      completions: a.completions,
      passRate: Math.round((a.completions / a.attempts) * 100),
    });
  }

  const sortedAsc = [...rows].sort((x, y) => x.passRate - y.passRate);
  const sortedDesc = [...rows].sort((x, y) => y.passRate - x.passRate);

  return {
    hardest: sortedAsc.slice(0, limit),
    easiest: sortedDesc.slice(0, limit),
  };
}

// ─── 9. Streak distribution ─────────────────────────────────────────

export interface StreakBucket {
  range: string;  // "1-2", "3-6", "7-13", "14-29", "30+"
  count: number;
}

export async function getStreakDistribution(): Promise<StreakBucket[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak_count');

  if (error || !data) return [];

  const buckets = { '0': 0, '1-2': 0, '3-6': 0, '7-13': 0, '14-29': 0, '30+': 0 };
  for (const row of data) {
    const s = Number(row.streak_count) || 0;
    if (s === 0) buckets['0']++;
    else if (s <= 2) buckets['1-2']++;
    else if (s <= 6) buckets['3-6']++;
    else if (s <= 13) buckets['7-13']++;
    else if (s <= 29) buckets['14-29']++;
    else buckets['30+']++;
  }

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}
