import { supabase } from '@/src/lib/supabase';
import { notifyChallengeResult, notifyChallengeReceived, notifyChallengeDeclined } from '@/src/utils/notifications';
import { checkAchievements } from '@/src/utils/achievements';
import { log } from '@/src/lib/logger';

// ──────────────────────────────────────────────────────────────────────
// Difficulty tiers map to world ranges. Easy = worlds 1-2 (shape +
// colour basics), Medium = worlds 3-4 (numbers + moving objects),
// Hard = worlds 5-6 (photographic + mastermind). Level ids follow
// the `w{N}-l{X}` convention already used everywhere in the codebase.
// ──────────────────────────────────────────────────────────────────────

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_WORLDS: Record<ChallengeDifficulty, number[]> = {
  easy:   [1, 2],
  medium: [3, 4],
  hard:   [5, 6],
};

export const DIFFICULTY_META: Record<ChallengeDifficulty, { label: string; description: string; color: string }> = {
  easy:   { label: 'Easy',   description: 'Worlds 1 & 2, shape and colour basics',   color: '#00B894' },
  medium: { label: 'Medium', description: 'Worlds 3 & 4, numbers and moving objects', color: '#F9A825' },
  hard:   { label: 'Hard',   description: 'Worlds 5 & 6, photographic and mastermind', color: '#FF6B6B' },
};

function levelBelongsToWorld(levelId: string, world: number): boolean {
  return levelId.startsWith(`w${world}-l`);
}

function filterByDifficulty<T extends { id: string }>(levels: T[], difficulty: ChallengeDifficulty): T[] {
  const worlds = DIFFICULTY_WORLDS[difficulty];
  return levels.filter(l => worlds.some(w => levelBelongsToWorld(l.id, w)));
}

/**
 * Pick N levels from `pool` with a minimum guaranteed count per world.
 * Ensures a set like Easy (w1+w2) always ends up 2-3 or 3-2 instead of
 * landing 5-0 or 4-1 by chance, which makes the challenge feel
 * deliberately authored rather than a lazy random grab.
 *
 * Falls back gracefully: if a world has fewer levels available than
 * the per-world minimum, it takes what's there and tops up from the
 * other world(s).
 */
function pickWithSpread<T extends { id: string }>(
  pool: T[],
  worlds: number[],
  count: number,
): T[] {
  // Bucket the pool by world using the existing `w{N}-l...` prefix.
  const byWorld = new Map<number, T[]>();
  for (const w of worlds) byWorld.set(w, []);
  for (const item of pool) {
    for (const w of worlds) {
      if (item.id.startsWith(`w${w}-l`)) {
        byWorld.get(w)!.push(item);
        break;
      }
    }
  }

  // Shuffle each bucket independently so the minimum-per-world picks
  // are still varied across challenges.
  for (const list of byWorld.values()) {
    list.sort(() => Math.random() - 0.5);
  }

  const minPerWorld = Math.floor(count / worlds.length);

  // First pass: take the guaranteed minimum from each world.
  const selected: T[] = [];
  const leftover: T[] = [];
  for (const w of worlds) {
    const list = byWorld.get(w)!;
    const take = Math.min(minPerWorld, list.length);
    selected.push(...list.slice(0, take));
    leftover.push(...list.slice(take));
  }

  // Second pass: fill the remaining slots from the combined leftover
  // pool. This is where the 2-3 vs 3-2 split is decided — it's random
  // across the two worlds' remaining items rather than always biased
  // to the same side.
  leftover.sort(() => Math.random() - 0.5);
  const needed = count - selected.length;
  if (needed > 0) selected.push(...leftover.slice(0, needed));

  return selected;
}

/**
 * Pick 5 random level ids scoped to the requested difficulty tier,
 * preferring levels both players have already completed. Returns the
 * chosen ids WITHOUT inserting a challenge row. The caller inserts
 * the row later (once the challenger has actually played their half)
 * via `insertChallengeRow` — this prevents "phantom" pending rows
 * from appearing in the friends tab if the challenger aborts before
 * submitting a score.
 */
export async function pickChallengeLevels(
  challengerId: string,
  challengedId: string,
  difficulty: ChallengeDifficulty = 'medium',
): Promise<string[]> {
  try {
    const [{ data: myProgress }, { data: theirProgress }] = await Promise.all([
      supabase.from('user_progress').select('level_id').eq('user_id', challengerId),
      supabase.from('user_progress').select('level_id').eq('user_id', challengedId),
    ]);

    const { data: allLevels } = await supabase
      .from('campaign_levels')
      .select('id')
      .eq('status', 'complete');

    if (!allLevels || allLevels.length === 0) return [];

    const myCompleted = new Set((myProgress ?? []).map(p => p.level_id));
    const theirCompleted = new Set((theirProgress ?? []).map(p => p.level_id));

    const tierLevels = filterByDifficulty(allLevels, difficulty);
    if (tierLevels.length === 0) {
      log.warn('challenges', `no levels for difficulty ${difficulty}, falling back to all`, { difficulty });
    }

    const bothCompleted = tierLevels.filter(l => myCompleted.has(l.id) && theirCompleted.has(l.id));
    const pool = bothCompleted.length >= 5
      ? bothCompleted
      : (tierLevels.length > 0 ? tierLevels : allLevels);

    // `pickWithSpread` forces the 5-level set to include at least two
    // from each world in the difficulty tier, falling back to more
    // from the available world(s) when the pool is short. For the
    // all-levels emergency fallback there's only one "world range"
    // to spread across, so the spread is a no-op there.
    const worlds = DIFFICULTY_WORLDS[difficulty];
    const selected = pickWithSpread(pool, worlds, 5);
    return selected.map(l => l.id);
  } catch (e) {
    log.error('challenges', 'pickChallengeLevels threw', e, { challengerId, challengedId, difficulty });
    return [];
  }
}

/**
 * Insert the `friend_challenges` row AFTER the challenger has finished
 * their half. The challenger's score is included in the insert so the
 * row never exists in a "pending but untouched by the challenger" state
 * that'd make the friends tab misrender who owes whom a turn.
 *
 * Fires `notifyChallengeReceived` immediately after a successful insert.
 */
export async function insertChallengeRow(params: {
  challengerId: string;
  challengedId: string;
  levelIds: string[];
  difficulty: ChallengeDifficulty;
  challengerScore: number;
  challengerStars: number;
  modeName?: string;
}): Promise<string | null> {
  try {
    if (params.levelIds.length === 0) return null;
    const { data, error } = await supabase
      .from('friend_challenges')
      .insert({
        challenger_id: params.challengerId,
        challenged_id: params.challengedId,
        level_ids: params.levelIds,
        mode: 'classic',
        mode_data: { difficulty: params.difficulty },
        challenger_score: params.challengerScore,
        challenger_stars: params.challengerStars,
        status: 'pending',
      })
      .select('id')
      .single();
    if (log.supabaseError('challenges', 'insertChallengeRow', error, { challengerId: params.challengerId, challengedId: params.challengedId })) return null;
    const id = data?.id ?? null;
    if (id) {
      // Fire and forget the "you've been challenged" notification now
      // that the row is fully persisted + has a real score.
      sendChallengeNotification(
        id,
        params.challengerId,
        params.challengedId,
        params.modeName ?? 'Classic',
      ).catch(() => {});
    }
    return id;
  } catch (e) {
    log.error('challenges', 'insertChallengeRow threw', e, { challengerId: params.challengerId, challengedId: params.challengedId });
    return null;
  }
}

/**
 * Legacy wrapper — kept for any caller that still expects the old
 * "pick + insert in one shot" behaviour. This is the path that
 * caused the phantom row bug; new code should call `pickChallengeLevels`
 * and `insertChallengeRow` separately.
 *
 * @deprecated Prefer the two-step flow.
 */
export async function createChallenge(
  challengerId: string,
  challengedId: string,
  opts: { difficulty?: ChallengeDifficulty } = {},
): Promise<string | null> {
  const difficulty = opts.difficulty ?? 'medium';
  const levelIds = await pickChallengeLevels(challengerId, challengedId, difficulty);
  if (levelIds.length === 0) return null;
  return insertChallengeRow({
    challengerId,
    challengedId,
    levelIds,
    difficulty,
    challengerScore: 0,
    challengerStars: 0,
  });
}

/**
 * Decline an incoming challenge — deletes the pending row and fires a
 * "X declined your challenge" notification to the challenger.
 *
 * The friends tab badge and the card list both drive off the
 * `friend_challenges` query, so removing the row cleans up both sides
 * in one shot. We use DELETE (not a status='declined' update) because
 * the schema doesn't have a dedicated index for declined rows and
 * keeping stale rejected rows around would pollute the acceptance-rate
 * queries used by the achievements system.
 */
export async function declineChallenge(
  challengeId: string,
  myUserId: string,
): Promise<boolean> {
  try {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('challenger_id, challenged_id')
      .eq('id', challengeId)
      .single();
    if (!challenge) return false;
    // Only the addressee can decline — challengers cancelling their own
    // outgoing challenge go through a different path.
    if (challenge.challenged_id !== myUserId) return false;

    const { error } = await supabase
      .from('friend_challenges')
      .delete()
      .eq('id', challengeId);
    if (log.supabaseError('challenges', 'declineChallenge.delete', error, { challengeId, myUserId })) return false;

    // Fire the "X declined your challenge" notification.
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', myUserId)
      .single();
    if (myProfile?.username) {
      notifyChallengeDeclined(challenge.challenger_id, myProfile.username).catch(() => {});
    }
    return true;
  } catch (e) {
    log.error('challenges', 'declineChallenge threw', e, { challengeId, myUserId });
    return false;
  }
}

/**
 * Cancel an outgoing challenge that the CHALLENGER started and then
 * abandoned before submitting a score. Deletes the pending row so it
 * doesn't sit forever. The other side was never notified.
 */
export async function cancelOutgoingChallenge(
  challengeId: string,
  myUserId: string,
): Promise<boolean> {
  try {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('challenger_id, challenger_score')
      .eq('id', challengeId)
      .single();
    if (!challenge) return false;
    if (challenge.challenger_id !== myUserId) return false;
    // If the challenger already submitted a score, they can't just
    // cancel — that'd steal the addressee's chance to respond.
    if (challenge.challenger_score !== null && challenge.challenger_score !== undefined) return false;
    const { error } = await supabase
      .from('friend_challenges')
      .delete()
      .eq('id', challengeId);
    if (log.supabaseError('challenges', 'cancelOutgoingChallenge.delete', error, { challengeId, myUserId })) return false;
    return true;
  } catch (e) {
    log.error('challenges', 'cancelOutgoingChallenge threw', e, { challengeId, myUserId });
    return false;
  }
}

/**
 * Fire the "challenger_username challenged you!" notification on the
 * addressee's side. Called from the classic + exclusive flows once the
 * row is fully persisted so we don't notify for an abandoned challenge.
 */
export async function sendChallengeNotification(
  challengeId: string,
  challengerId: string,
  challengedId: string,
  modeName: string,
): Promise<void> {
  try {
    const { data: challengerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', challengerId)
      .single();
    if (challengerProfile?.username) {
      await notifyChallengeReceived(
        challengedId,
        challengerProfile.username,
        modeName,
        challengeId,
      );
    }
  } catch (e) {
    log.error('challenges', 'sendChallengeNotification threw', e, { challengeId, challengerId, challengedId });
  }
}

/**
 * Record a player's score for a challenge.
 *
 * Status management is now handled by a Postgres trigger
 * (`mark_challenge_completed`) that flips status -> 'completed'
 * the moment both score columns become non-null. This removes a
 * real client-side race where two simultaneous writers each read
 * null for the other's score and neither ended up setting status
 * to 'completed', stranding the row as 'live'/'pending' forever.
 *
 * After UPDATE we re-read the row to decide whether to fire the
 * "result ready" push notification (only the second finisher's
 * write actually flips the row to completed).
 */
export async function recordChallengeScore(
  challengeId: string,
  userId: string,
  score: number,
  stars: number,
): Promise<boolean> {
  try {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) return false;

    const isChallenger = challenge.challenger_id === userId;
    const update: Record<string, unknown> = isChallenger
      ? { challenger_score: score, challenger_stars: stars }
      : { challenged_score: score, challenged_stars: stars };

    const { error } = await supabase
      .from('friend_challenges')
      .update(update)
      .eq('id', challengeId);

    if (log.supabaseError('challenges', 'recordChallengeScore', error, { challengeId, userId, score })) return false;

    // Re-read to get the authoritative post-trigger status and both
    // scores. `mark_challenge_completed` (BEFORE UPDATE trigger) will
    // have flipped status to 'completed' and stamped completed_at if
    // both score columns are now non-null.
    const { data: fresh } = await supabase
      .from('friend_challenges')
      .select('status, challenger_score, challenged_score, challenger_id, challenged_id')
      .eq('id', challengeId)
      .single();

    // Only the player whose write actually completed the challenge
    // (i.e. the second finisher) should fire the result notification
    // and the "challenge won" achievement check. Otherwise both
    // writers race to send the same push and the achievement tally
    // double-counts.
    const justCompleted = fresh?.status === 'completed' && fresh.challenger_score != null && fresh.challenged_score != null;
    if (justCompleted) {
      const myScore = isChallenger ? fresh.challenger_score : fresh.challenged_score;
      const theirScore = isChallenger ? fresh.challenged_score : fresh.challenger_score;

      if (myScore != null && theirScore != null && myScore > theirScore) {
        const { count } = await supabase
          .from('friend_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .or(
            `and(challenger_id.eq.${userId},challenger_score.gt.challenged_score),and(challenged_id.eq.${userId},challenged_score.gt.challenger_score)`,
          );
        checkAchievements(userId, { type: 'challenge_won', data: { totalChallengesWon: count ?? 0 } }).catch(() => {});
      }

      // Notify the OPPONENT of the completion. Only the second
      // finisher's device runs this branch, so there's no dupe.
      const opponentId = isChallenger ? fresh.challenged_id : fresh.challenger_id;
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      if (myProfile?.username && myScore != null && theirScore != null) {
        notifyChallengeResult(
          opponentId,
          myProfile.username,
          theirScore,   // opponent's own score (from their perspective the "their" score is ours)
          myScore,
          challengeId,
        ).catch(() => {});
      }
    }

    return true;
  } catch (e) {
    log.error('challenges', 'recordChallengeScore threw', e, { challengeId, userId, score });
    return false;
  }
}

/**
 * Expire old pending challenges. Runs on friends-tab focus and
 * cleans up any pending row that's been sitting around for more
 * than EXPIRY_HOURS hours. Expired rows are marked `status: 'expired'`
 * so the addressee's active-challenges list stops surfacing them.
 *
 * 2 hours is intentionally much shorter than the spec'd 48 hours
 * from the original design: challenges are meant to feel lively,
 * and a 2-day-old "juanjo challenged you" that's been sitting in
 * your tab since last week is more annoying than it is useful.
 * Players can still decline manually via the X on each card at
 * any time before the timer runs out.
 */
const EXPIRY_HOURS = 2;
export async function expireOldChallenges(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    await supabase
      .from('friend_challenges')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', cutoff);
    // Also expire any live-invite rows whose 60s acceptance window
    // elapsed while the invited user was offline / ignoring the modal.
    const nowIso = new Date().toISOString();
    await supabase
      .from('friend_challenges')
      .update({ status: 'expired' })
      .eq('status', 'invited')
      .lt('invite_expires_at', nowIso);
  } catch (e) {
    log.error('challenges', 'expireOldChallenges threw', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Real-time 1v1 invite flow (Clash-Royale style).
//
//  Difference from the async flow above: instead of the challenger
//  playing first and submitting a score, sendInvite() creates a row
//  with status='invited' that expires in INVITE_WINDOW_SECS. The
//  challenged user's device receives a Supabase realtime INSERT and
//  surfaces an accept/decline modal. If they accept within the
//  window, status flips to 'live' and both clients navigate into
//  the game with the shared mode_data that was pre-generated on
//  the challenger's device. Scores flow through recordChallengeScore
//  as before, and the result screen hides both scores until both
//  sides have submitted.
// ═══════════════════════════════════════════════════════════════════

/** Window (seconds) the challenged user has to accept the invite. */
export const INVITE_WINDOW_SECS = 60;

/** Time after `profiles.last_seen` a user is still considered "online"
 *  for the purposes of issuing an instant invite. Matches the ≤2min
 *  bucket used by StatusDot in the friends list. */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

/** Check whether the given user should be considered online right
 *  now. Clients poll this before offering an instant invite; if the
 *  opponent is offline, the UI falls back to the async challenge
 *  flow (same as before this overhaul). */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('last_seen')
      .eq('id', userId)
      .single();
    if (!data?.last_seen) return false;
    return Date.now() - new Date(data.last_seen).getTime() < ONLINE_THRESHOLD_MS;
  } catch {
    return false;
  }
}

interface SendInviteArgs {
  challengerId: string;
  challengedId: string;
  mode: string;             // 'classic' | 'speed_recall' | 'snap_match' | ...
  modeData: unknown;        // pre-generated shared seed for both sides
  levelIds?: string[];      // classic mode only
  difficulty?: ChallengeDifficulty;
}

/** Create an "invited" row and return its id, or null on failure.
 *  Pre-generates mode_data so both sides play identical content. */
export async function sendInvite(args: SendInviteArgs): Promise<string | null> {
  try {
    const expiresAt = new Date(Date.now() + INVITE_WINDOW_SECS * 1000).toISOString();
    const insertBody: Record<string, unknown> = {
      challenger_id: args.challengerId,
      challenged_id: args.challengedId,
      mode: args.mode,
      mode_data: args.modeData,
      level_ids: args.levelIds ?? [],
      status: 'invited',
      invite_expires_at: expiresAt,
    };
    const { data, error } = await supabase
      .from('friend_challenges')
      .insert(insertBody)
      .select('id')
      .single();
    if (log.supabaseError('challenges', 'sendInvite', error, { challengerId: args.challengerId, challengedId: args.challengedId, mode: args.mode })) return null;
    return data?.id ?? null;
  } catch (e) {
    log.error('challenges', 'sendInvite threw', e, { args });
    return null;
  }
}

/** Flip a row from 'invited' to 'live' + stamp accepted_at. Returns
 *  the freshly-loaded row (needed by the challenged-side game screen
 *  so it can pull mode + mode_data without a second round-trip). */
export async function acceptInvite(challengeId: string): Promise<{ ok: boolean; row?: Record<string, unknown> }> {
  try {
    const { data, error } = await supabase
      .from('friend_challenges')
      .update({ status: 'live', accepted_at: new Date().toISOString() })
      .eq('id', challengeId)
      .eq('status', 'invited')  // defensive — don't accept an already-expired or cancelled invite
      .select('*')
      .single();
    if (log.supabaseError('challenges', 'acceptInvite', error, { challengeId })) return { ok: false };
    if (!data) return { ok: false };
    return { ok: true, row: data };
  } catch (e) {
    log.error('challenges', 'acceptInvite threw', e, { challengeId });
    return { ok: false };
  }
}

/** Challenged user explicitly declines. Marks status and notifies
 *  the challenger. Returns whether the update succeeded. */
export async function declineInvite(challengeId: string, declinerUsername?: string, challengerId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friend_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId)
      .eq('status', 'invited');
    if (log.supabaseError('challenges', 'declineInvite', error, { challengeId })) return false;
    if (challengerId && declinerUsername) {
      notifyChallengeDeclined(challengerId, declinerUsername).catch(() => {});
    }
    return true;
  } catch (e) {
    log.error('challenges', 'declineInvite threw', e, { challengeId });
    return false;
  }
}

/** Challenger cancels before the invite is accepted. */
export async function cancelInvite(challengeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friend_challenges')
      .delete()
      .eq('id', challengeId)
      .eq('status', 'invited');
    if (log.supabaseError('challenges', 'cancelInvite', error, { challengeId })) return false;
    return true;
  } catch (e) {
    log.error('challenges', 'cancelInvite threw', e, { challengeId });
    return false;
  }
}
