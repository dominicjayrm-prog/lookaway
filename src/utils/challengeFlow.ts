import { supabase } from '@/src/lib/supabase';

/**
 * Create a friend challenge: pick 5 random shared levels, insert row.
 * Returns the challenge ID or null on failure.
 */
export async function createChallenge(challengerId: string, challengedId: string): Promise<string | null> {
  try {
    // Get both players' progress to find shared unlocked levels
    const [{ data: myProgress }, { data: theirProgress }] = await Promise.all([
      supabase.from('user_progress').select('level_id').eq('user_id', challengerId),
      supabase.from('user_progress').select('level_id').eq('user_id', challengedId),
    ]);

    // Get all complete campaign levels
    const { data: allLevels } = await supabase
      .from('campaign_levels')
      .select('id')
      .eq('status', 'complete');

    if (!allLevels || allLevels.length === 0) return null;

    // Both players have unlocked a level if they've completed it OR it's in their earliest uncompleted world
    const myCompleted = new Set((myProgress ?? []).map(p => p.level_id));
    const theirCompleted = new Set((theirProgress ?? []).map(p => p.level_id));

    // Eligible = levels that exist in the DB (both can attempt any published level)
    // Prefer levels both have completed for fairness, but fall back to any
    const bothCompleted = allLevels.filter(l => myCompleted.has(l.id) && theirCompleted.has(l.id));
    const pool = bothCompleted.length >= 5 ? bothCompleted : allLevels;

    // Shuffle and pick 5
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    const levelIds = selected.map(l => l.id);

    if (levelIds.length === 0) return null;

    const { data, error } = await supabase
      .from('friend_challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        level_ids: levelIds,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) { console.warn('Create challenge error:', error); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.warn('Create challenge failed:', e);
    return null;
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
