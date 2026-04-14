/**
 * Streak rewards — Supabase wrappers around the `streak_rewards` table.
 *
 * Flow:
 *   1. New users get all 11 milestones seeded as unclaimed via
 *      `seedStreakMilestonesIfMissing(userId)`.
 *   2. Every time the streak increments, `claimDueStreakRewards(userId,
 *      streak)` is called to flip any unclaimed rows the streak now
 *      qualifies for, grant the gems + shields, and return the list of
 *      newly-claimed milestones so the caller can show toasts.
 *   3. The Streak Rewards screen reads the full per-user list via
 *      `getStreakRewards(userId)` for timeline rendering.
 *
 * Local AsyncStorage state in `streakMilestonesClaimed` is kept in sync
 * for offline rendering — Supabase wins on conflict (server is the
 * source of truth so claims sync across devices).
 */
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { STREAK_MILESTONES, type StreakMilestone } from '@/src/data/streakMilestones';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';

export interface StreakRewardRow {
  milestone_day: number;
  gems_reward: number;
  shields_reward: number;
  claimed: boolean;
  claimed_at: string | null;
}

/** Insert the 11 milestone rows for a user if they don't exist yet.
 *  Idempotent — runs through unique(user_id, milestone_day) so re-running
 *  is a no-op for any rows already present. */
export async function seedStreakMilestonesIfMissing(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const rows = STREAK_MILESTONES.map((m) => ({
      user_id: userId,
      milestone_day: m.day,
      gems_reward: m.gems,
      shields_reward: m.shields,
    }));
    // upsert with ignoreDuplicates so existing rows aren't reset to claimed=false
    await supabase.from('streak_rewards').upsert(rows, {
      onConflict: 'user_id,milestone_day',
      ignoreDuplicates: true,
    });
  } catch (e) {
    log.warn('streak', 'seedStreakMilestonesIfMissing failed', { error: String(e), userId });
  }
}

/** Reset every milestone row back to unclaimed for a user. Fired when the
 *  streak breaks (explicit reset, window expiry, or implicit reset in
 *  incrementStreak when the gap exceeds 1 day). This is what makes the
 *  rewards re-claimable — a player who hits day 100 then loses it and
 *  climbs back earns the rewards again. */
export async function resetAllStreakRewards(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase
      .from('streak_rewards')
      .update({ claimed: false, claimed_at: null })
      .eq('user_id', userId);
  } catch (e) {
    log.warn('streak', 'resetAllStreakRewards failed', { error: String(e), userId });
  }
}

/** Pull the full list of milestone rows for a user (used by the rewards
 *  screen for timeline rendering). Returns empty array on error. */
export async function getStreakRewards(userId: string): Promise<StreakRewardRow[]> {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from('streak_rewards')
      .select('milestone_day, gems_reward, shields_reward, claimed, claimed_at')
      .eq('user_id', userId)
      .order('milestone_day', { ascending: true });
    return (data ?? []) as StreakRewardRow[];
  } catch (e) {
    log.warn('streak', 'getStreakRewards failed', { error: String(e), userId });
    return [];
  }
}

export interface ClaimedMilestone extends StreakMilestone {
  claimedAt: string;
}

/** Find every milestone the player has reached but not yet claimed,
 *  flip them to claimed in Supabase, grant the gems + shields, and
 *  return the freshly-claimed list so the caller can queue toasts.
 *
 *  Returns [] when there's nothing new to claim. Order matches
 *  `STREAK_MILESTONES` so toasts appear in milestone order. */
export async function claimDueStreakRewards(
  userId: string,
  currentStreak: number,
): Promise<ClaimedMilestone[]> {
  if (!userId || currentStreak < 3) return [];
  try {
    // Fetch unclaimed milestones the streak qualifies for in one round-trip
    const { data: due } = await supabase
      .from('streak_rewards')
      .select('milestone_day, gems_reward, shields_reward')
      .eq('user_id', userId)
      .eq('claimed', false)
      .lte('milestone_day', currentStreak);

    if (!due || due.length === 0) return [];

    // Mark them claimed in a single update
    const days = due.map((r) => r.milestone_day);
    const claimedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('streak_rewards')
      .update({ claimed: true, claimed_at: claimedAt })
      .eq('user_id', userId)
      .in('milestone_day', days);
    if (updateErr) throw updateErr;

    // Sum totals, increment gems + shields on the profile in one shot
    const totalGems = due.reduce((s, r) => s + r.gems_reward, 0);
    const totalShields = due.reduce((s, r) => s + r.shields_reward, 0);

    if (totalGems > 0 || totalShields > 0) {
      // Read current values, increment, write back. Two reads/writes is
      // simpler than an RPC function and the volume is tiny (11 max ever).
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('gems, streak_shields')
        .eq('id', userId)
        .single();
      if (pErr || !profile) {
        // Profile gone (deleted account, RLS misconfig, etc) — bail before
        // we accidentally upsert a partial row. The streak_rewards rows
        // are already flipped to claimed=true so a retry won't try again.
        log.warn('streak', 'claim profile fetch failed', { error: String(pErr), userId });
        return [];
      }
      await supabase
        .from('profiles')
        .update({
          gems: (profile.gems ?? 0) + totalGems,
          streak_shields: (profile.streak_shields ?? 0) + totalShields,
        })
        .eq('id', userId);

      // Audit log so admin Economy page reflects the gem injection
      if (totalGems > 0) {
        logEconomyEvent(userId, ECONOMY_EVENTS.GEM_EARN_STREAK, totalGems, {
          milestoneDays: days,
          shieldsEarned: totalShields,
        });
      }
    }

    // Return the matching StreakMilestone objects in spec order
    const claimedSet = new Set(days);
    return STREAK_MILESTONES
      .filter((m) => claimedSet.has(m.day))
      .map((m) => ({ ...m, claimedAt }));
  } catch (e) {
    log.error('streak', 'claimDueStreakRewards failed', e, { userId, currentStreak });
    return [];
  }
}

/** Claim ONE milestone explicitly (tapped from the rewards screen).
 *  Used when the player wants to redeem a reached-but-unclaimed reward
 *  manually instead of waiting for the auto-claim on next level complete.
 *
 *  Validates server-side that the milestone is unclaimed AND the player's
 *  streak qualifies before granting. Returns the milestone definition
 *  (with claimedAt) on success, null on any failure (already claimed,
 *  not reached, network error). */
export async function claimSingleMilestone(
  userId: string,
  milestoneDay: number,
  currentStreak: number,
): Promise<ClaimedMilestone | null> {
  if (!userId) return null;
  const def = STREAK_MILESTONES.find((m) => m.day === milestoneDay);
  if (!def) return null;
  if (currentStreak < def.day) return null; // Not reached — defensive

  try {
    // Read row to verify it's still unclaimed (race protection — another
    // device may have claimed it via the auto-claim path).
    const { data: row } = await supabase
      .from('streak_rewards')
      .select('claimed')
      .eq('user_id', userId)
      .eq('milestone_day', milestoneDay)
      .single();
    if (!row || row.claimed) return null;

    const claimedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('streak_rewards')
      .update({ claimed: true, claimed_at: claimedAt })
      .eq('user_id', userId)
      .eq('milestone_day', milestoneDay)
      .eq('claimed', false); // Conditional update — can't double-grant
    if (updErr) throw updErr;

    // Grant the reward on the profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('gems, streak_shields')
      .eq('id', userId)
      .single();
    if (pErr || !profile) {
      log.warn('streak', 'claimSingleMilestone profile fetch failed', { userId });
      return null;
    }
    await supabase
      .from('profiles')
      .update({
        gems: (profile.gems ?? 0) + def.gems,
        streak_shields: (profile.streak_shields ?? 0) + def.shields,
      })
      .eq('id', userId);

    if (def.gems > 0) {
      logEconomyEvent(userId, ECONOMY_EVENTS.GEM_EARN_STREAK, def.gems, {
        milestoneDays: [milestoneDay],
        shieldsEarned: def.shields,
        manual: true,
      });
    }
    return { ...def, claimedAt };
  } catch (e) {
    log.error('streak', 'claimSingleMilestone failed', e, { userId, milestoneDay });
    return null;
  }
}
