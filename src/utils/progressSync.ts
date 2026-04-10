import { supabase } from '@/src/lib/supabase';
import { INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';
import type { SubscriptionStatus } from '@/src/store/gameStore';

/**
 * Sync user progress to Supabase. Fire and forget.
 */
export async function saveProgressToSupabase(userId: string, state: {
  gems: number;
  lives: number;
  livesLastLostAt: number | null;
  streakCount: number;
  totalStars: number;
  highestWorld: number;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
}) {
  try {
    // Update profile
    const memoryScore = state.completedScores.length > 0
      ? Math.round(state.completedScores.reduce((a, v) => a + v, 0) / state.completedScores.length)
      : 0;

    await supabase.from('profiles').upsert({
      id: userId,
      gems: state.gems,
      lives: state.lives,
      lives_last_lost_at: state.livesLastLostAt ? new Date(state.livesLastLostAt).toISOString() : null,
      streak_count: state.streakCount,
      total_stars: state.totalStars,
      highest_world: state.highestWorld,
      memory_score_avg: memoryScore,
      equipped_frame: state.equippedFrame ?? null,
      equipped_expression: state.equippedExpression ?? null,
      equipped_banner: state.equippedBanner ?? null,
      equipped_name_color: state.equippedNameColor ?? null,
      owned_cosmetics: state.ownedCosmetics ?? [],
      power_ups: state.powerUps ?? {},
      streak_milestones_claimed: state.streakMilestonesClaimed ?? [],
      last_play_date: state.lastPlayDate ?? null,
      completed_scores: state.completedScores ?? [],
      max_lives: state.maxLives ?? 5,
      login_reward_day: state.loginReward?.currentDay ?? 0,
      login_reward_last_claim: state.loginReward?.lastClaimDate || null,
      login_reward_streak: state.loginReward?.streak ?? 0,
      best_streak: state.bestStreak ?? 0,
      days_played: state.daysPlayed ?? 0,
      subscription_status: state.subscriptionStatus ?? 'inactive',
    }, { onConflict: 'id' });

    // Upsert level progress
    const entries = Object.entries(state.levelProgress);
    if (entries.length > 0) {
      const rows = entries.map(([levelId, p]) => ({
        user_id: userId,
        level_id: levelId,
        stars: p.stars,
        best_score: p.bestScore,
        attempts: p.attempts,
        completed_at: new Date().toISOString(),
      }));

      for (const row of rows) {
        await supabase.from('user_progress').upsert(row, {
          onConflict: 'user_id,level_id',
        });
      }
    }
  } catch (e) {
    console.warn('Progress sync error:', e);
  }
}

/**
 * Load user progress from Supabase on login.
 */
export async function loadProgressFromSupabase(userId: string): Promise<{
  gems: number;
  lives: number;
  livesLastLostAt: number | null;
  streakCount: number;
  bestStreak: number;
  daysPlayed: number;
  subscriptionStatus: SubscriptionStatus;
  totalStars: number;
  highestWorld: number;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
  ownedCosmetics: string[];
  equippedFrame: string;
  equippedBanner: string;
  equippedNameColor: string;
  equippedExpression: string;
  powerUps: Record<string, number>;
  streakMilestonesClaimed: number[];
  lastPlayDate: string | null;
  completedScores: number[];
  maxLives: number;
  loginReward: LoginRewardState;
} | null> {
  try {
    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    // Load level progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    const levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }> = {};
    const completedScores: number[] = [];

    (progress ?? []).forEach((p: { level_id: string; stars: number; best_score: number; attempts: number }) => {
      levelProgress[p.level_id] = {
        stars: p.stars,
        bestScore: p.best_score,
        attempts: p.attempts,
      };
      if (p.best_score > 0) completedScores.push(p.best_score);
    });

    return {
      gems: profile.gems ?? 50,
      lives: profile.lives ?? 5,
      livesLastLostAt: profile.lives_last_lost_at ? new Date(profile.lives_last_lost_at).getTime() : null,
      streakCount: profile.streak_count ?? 0,
      bestStreak: profile.best_streak ?? 0,
      daysPlayed: profile.days_played ?? 0,
      subscriptionStatus: (profile.subscription_status === 'active' ? 'active' : 'inactive') as SubscriptionStatus,
      totalStars: profile.total_stars ?? 0,
      highestWorld: profile.highest_world ?? 1,
      levelProgress,
      completedScores,
      ownedCosmetics: Array.isArray(profile.owned_cosmetics) ? profile.owned_cosmetics : [],
      equippedFrame: profile.equipped_frame ?? 'frame_blink_normal',
      equippedBanner: profile.equipped_banner ?? 'banner_none',
      equippedNameColor: profile.equipped_name_color ?? 'name_default',
      equippedExpression: profile.equipped_expression ?? 'expr_normal',
      powerUps: profile.power_ups && typeof profile.power_ups === 'object' ? profile.power_ups : {},
      streakMilestonesClaimed: Array.isArray(profile.streak_milestones_claimed) ? profile.streak_milestones_claimed : [],
      lastPlayDate: profile.last_play_date ?? null,
      completedScores: Array.isArray(profile.completed_scores) ? profile.completed_scores : [],
      maxLives: profile.max_lives ?? 5,
      loginReward: {
        currentDay: typeof profile.login_reward_day === 'number' ? profile.login_reward_day : INITIAL_LOGIN_REWARD_STATE.currentDay,
        lastClaimDate: profile.login_reward_last_claim ?? INITIAL_LOGIN_REWARD_STATE.lastClaimDate,
        streak: typeof profile.login_reward_streak === 'number' ? profile.login_reward_streak : INITIAL_LOGIN_REWARD_STATE.streak,
      },
    };
  } catch (e) {
    console.warn('Progress sync error:', e);
    return null;
  }
}
