import { supabase } from '@/src/lib/supabase';
import { notifyChallengeResult, notifyChallengeReceived, notifyChallengeDeclined } from '@/src/utils/notifications';
import { checkAchievements } from '@/src/utils/achievements';

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
  easy:   { label: 'Easy',   description: 'Worlds 1 & 2 — shape and colour basics',   color: '#00B894' },
  medium: { label: 'Medium', description: 'Worlds 3 & 4 — numbers and moving objects', color: '#F9A825' },
  hard:   { label: 'Hard',   description: 'Worlds 5 & 6 — photographic and mastermind', color: '#FF6B6B' },
};

function levelBelongsToWorld(levelId: string, world: number): boolean {
  return levelId.startsWith(`w${world}-l`);
}

function filterByDifficulty<T extends { id: string }>(levels: T[], difficulty: ChallengeDifficulty): T[] {
  const worlds = DIFFICULTY_WORLDS[difficulty];
  return levels.filter(l => worlds.some(w => levelBelongsToWorld(l.id, w)));
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
      console.warn(`No challenge levels for difficulty ${difficulty} — falling back to all levels`);
    }

    const bothCompleted = tierLevels.filter(l => myCompleted.has(l.id) && theirCompleted.has(l.id));
    const pool = bothCompleted.length >= 5
      ? bothCompleted
      : (tierLevels.length > 0 ? tierLevels : allLevels);

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(5, shuffled.length)).map(l => l.id);
  } catch (e) {
    console.warn('pickChallengeLevels failed:', e);
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
    if (error) { console.warn('insertChallengeRow error:', error); return null; }
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
    console.warn('insertChallengeRow failed:', e);
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
    if (error) { console.warn('Decline challenge delete error:', error); return false; }

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
    console.warn('Decline challenge failed:', e);
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
    if (error) { console.warn('Cancel challenge delete error:', error); return false; }
    return true;
  } catch (e) {
    console.warn('Cancel challenge failed:', e);
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
    console.warn('sendChallengeNotification failed:', e);
  }
}

/**
 * Record a player's score for a challenge.
 * If both scores are now recorded, mark as completed.
 */
export async function recordChallengeScore(
  challengeId: string,
  userId: string,
  score: number,
  stars: number,
): Promise<boolean> {
  try {
    // Get the challenge to determine which side this user is
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

    // Check if the other side has already played
    const otherScore = isChallenger ? challenge.challenged_score : challenge.challenger_score;
    if (otherScore !== null) {
      update.status = 'completed';
      update.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('friend_challenges')
      .update(update)
      .eq('id', challengeId);

    if (error) { console.warn('Record challenge score error:', error); return false; }

    // Check challenge achievements (challenge sent for challenger, challenge won for winner)
    if (update.status === 'completed') {
      const myScore = score;
      const theirScore = otherScore as number;
      if (myScore > theirScore) {
        // Count total wins for this user
        const { count } = await supabase
          .from('friend_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .or(
            `and(challenger_id.eq.${userId},challenger_score.gt.challenged_score),and(challenged_id.eq.${userId},challenged_score.gt.challenger_score)`,
          );
        checkAchievements(userId, { type: 'challenge_won', data: { totalChallengesWon: count ?? 0 } }).catch(() => {});
      }
    }

    // If challenge is now completed, notify the challenger about the result
    if (update.status === 'completed' && !isChallenger) {
      // The challenged player just finished — notify the challenger
      const myScore = score;
      const theirScore = otherScore as number;
      // Get username of the player who just finished
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      if (myProfile?.username) {
        notifyChallengeResult(
          challenge.challenger_id,
          myProfile.username,
          theirScore, // challenger's score
          myScore,    // challenged's score
          challengeId,
        ).catch(() => {}); // Fire and forget
      }
    }

    return true;
  } catch (e) {
    console.warn('Record challenge score failed:', e);
    return false;
  }
}

/**
 * Expire old pending challenges (>48h).
 */
export async function expireOldChallenges(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('friend_challenges')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', cutoff);
  } catch (e) {
    console.warn('Expire challenges failed:', e);
  }
}
