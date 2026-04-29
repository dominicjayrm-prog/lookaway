import { supabase } from '@/src/lib/supabase';
import { INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';
import type { SubscriptionStatus, GameStore } from '@/src/store/gameStore';
import { log } from '@/src/lib/logger';
import { TOTAL_POSITIONS, type ModeId, type WorldTheme } from '@/src/data/unifiedJourney';

/**
 * Sync user progress to Supabase. Fire and forget.
 *
 * Accepts the full `GameStore` shape because the upsert body reads
 * ~20 fields off it — the old signature only typed 8 of them and
 * relied on TypeScript's structural subtyping to silently accept
 * the extras, which meant any field renames would go unnoticed.
 */
export async function saveProgressToSupabase(userId: string, state: GameStore) {
  try {
    // Ownership guard — refuse to write if the in-memory state's
    // implicit owner doesn't match the userId we're writing FOR.
    // This catches the class of bug where account A's cosmetics /
    // stars / login-reward state leak onto account B's profile row
    // during a fast sign-out → sign-in switch. Without this guard
    // a stale debounced save could fire mid-swap and corrupt
    // whichever user's row is currently in `userId`.
    if (state._authUserId && state._authUserId !== userId) {
      log.warn('sync', 'refusing cross-account save — state owner differs from target', {
        stateOwner: state._authUserId, target: userId,
      });
      return;
    }

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
      last_plus_gem_grant_at: state.lastPlusGemGrantAt ?? null,
      last_review_prompted_at: state.lastReviewPromptedAt ?? null,
      review_prompt_outcome: state.reviewPromptOutcome ?? null,
      preferred_language: state.preferredLanguage ?? 'system',
      completed_scores: state.completedScores ?? [],
      max_lives: state.maxLives ?? 5,
      login_reward_day: state.loginReward?.currentDay ?? 0,
      login_reward_last_claim: state.loginReward?.lastClaimDate || null,
      login_reward_streak: state.loginReward?.streak ?? 0,
      best_streak: state.bestStreak ?? 0,
      days_played: state.daysPlayed ?? 0,
      streak_shields: state.streakShields ?? 0,
      recovery_window_start: state.recoveryWindowStart ?? null,
      // Unified Brain Journey — cloud-mirrored so progress follows the
      // user across devices. The clamp on unified_position is enforced
      // by a CHECK constraint on the column, so we defend against
      // corrupted local state here rather than let the upsert 500.
      unified_position: Math.min(TOTAL_POSITIONS, Math.max(1, state.unifiedPosition ?? 1)),
      current_world_theme: state.currentWorldTheme ?? 'emerald_grove',
      last_played_mode: state.lastPlayedMode ?? null,
      last_played_level_id: state.lastPlayedLevelId ?? null,
      has_seen_unified_intro: state.hasSeenUnifiedIntro ?? false,
      has_seen_world_intro: state.hasSeenWorldIntro ?? {},
      has_seen_brain_master: state.hasSeenBrainMaster ?? false,
      has_seen_grand_master: state.hasSeenGrandMaster ?? false,
      // tutorial_seen is written separately when the player completes the
      // spotlight tour (one-shot from app/(tabs)/index.tsx) — we do NOT
      // upsert it here because every save would re-write the same flag.
      subscription_status: state.subscriptionStatus ?? 'inactive',
      // username is NOT written from here — it's set by app/username.tsx
      // at signup and we only READ it into the store via loadFromCloud.
      // Writing a nullable value here would risk clobbering the real
      // username on any early save before cloud hydration completes.
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

      // Batch the upsert into a single round-trip — the previous
      // sequential per-row loop fired one HTTP request per level, which
      // for a deep player (200+ entries) meant 200+ awaits per save and
      // partial-data loss on mid-save crashes.
      await supabase.from('user_progress').upsert(rows, {
        onConflict: 'user_id,level_id',
      });
    }
  } catch (e) {
    log.error('sync', 'saveProgressToSupabase threw', e, { userId });
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
  streakShields: number;
  recoveryWindowStart: string | null;
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
  lastPlusGemGrantAt: string | null;
  lastReviewPromptedAt: string | null;
  reviewPromptOutcome: 'accepted' | 'dismissed' | null;
  preferredLanguage: 'system' | 'en' | 'es';
  maxLives: number;
  loginReward: LoginRewardState;
  username: string | null;
  avatarUrl: string | null;
  /** Cloud's last write time in ms since epoch. Used by the merge
   *  logic to decide whether local or cloud is the more recent source
   *  of truth for scalar fields like gems and equipped_*. */
  cloudUpdatedAt: number;
  // ── Unified Brain Journey ──
  /** 1-400. Server mirror of `unifiedPosition`. */
  unifiedPosition: number;
  currentWorldTheme: WorldTheme;
  lastPlayedMode: ModeId | null;
  lastPlayedLevelId: string | null;
  hasSeenUnifiedIntro: boolean;
  hasSeenWorldIntro: Partial<Record<WorldTheme, boolean>>;
  hasSeenBrainMaster: boolean;
  hasSeenGrandMaster: boolean;
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

    (progress ?? []).forEach((p: { level_id: string; stars: number; best_score: number; attempts: number }) => {
      levelProgress[p.level_id] = {
        stars: p.stars,
        bestScore: p.best_score,
        attempts: p.attempts,
      };
    });

    return {
      gems: profile.gems ?? 50,
      lives: profile.lives ?? 5,
      livesLastLostAt: profile.lives_last_lost_at ? new Date(profile.lives_last_lost_at).getTime() : null,
      streakCount: profile.streak_count ?? 0,
      bestStreak: profile.best_streak ?? 0,
      daysPlayed: profile.days_played ?? 0,
      streakShields: profile.streak_shields ?? 0,
      recoveryWindowStart: profile.recovery_window_start ?? null,
      username: profile.username ?? null,
      avatarUrl: profile.avatar_url ?? null,
      subscriptionStatus: (profile.subscription_status === 'active' ? 'active' : 'inactive') as SubscriptionStatus,
      totalStars: profile.total_stars ?? 0,
      highestWorld: profile.highest_world ?? 1,
      levelProgress,
      ownedCosmetics: Array.isArray(profile.owned_cosmetics) ? profile.owned_cosmetics : [],
      equippedFrame: profile.equipped_frame ?? 'frame_blink_normal',
      equippedBanner: profile.equipped_banner ?? 'banner_none',
      equippedNameColor: profile.equipped_name_color ?? 'name_default',
      equippedExpression: profile.equipped_expression ?? 'expr_normal',
      powerUps: profile.power_ups && typeof profile.power_ups === 'object' ? profile.power_ups : {},
      streakMilestonesClaimed: Array.isArray(profile.streak_milestones_claimed) ? profile.streak_milestones_claimed : [],
      lastPlayDate: profile.last_play_date ?? null,
      lastPlusGemGrantAt: profile.last_plus_gem_grant_at ?? null,
      lastReviewPromptedAt: profile.last_review_prompted_at ?? null,
      reviewPromptOutcome: profile.review_prompt_outcome === 'accepted' || profile.review_prompt_outcome === 'dismissed'
        ? profile.review_prompt_outcome
        : null,
      preferredLanguage: (profile.preferred_language === 'en' || profile.preferred_language === 'es' || profile.preferred_language === 'system')
        ? profile.preferred_language
        : 'system',
      // completed_scores lives directly on the profile row — it's the
      // denormalized cache that saveProgressToSupabase writes back. We
      // used to also recompute it from user_progress here, but that
      // path was dead because the second key overrode the first.
      completedScores: Array.isArray(profile.completed_scores) ? profile.completed_scores : [],
      maxLives: profile.max_lives ?? 5,
      loginReward: {
        currentDay: typeof profile.login_reward_day === 'number' ? profile.login_reward_day : INITIAL_LOGIN_REWARD_STATE.currentDay,
        lastClaimDate: profile.login_reward_last_claim ?? INITIAL_LOGIN_REWARD_STATE.lastClaimDate,
        streak: typeof profile.login_reward_streak === 'number' ? profile.login_reward_streak : INITIAL_LOGIN_REWARD_STATE.streak,
      },
      cloudUpdatedAt: profile.updated_at ? new Date(profile.updated_at).getTime() : 0,
      // Unified Brain Journey — defensive coercion since these columns
      // may not exist on very old cloud rows that haven't been written
      // to since the schema migration landed (on first sign-in the
      // next saveProgressToSupabase will populate them).
      unifiedPosition:
        typeof profile.unified_position === 'number'
          ? Math.min(TOTAL_POSITIONS, Math.max(1, profile.unified_position))
          : 1,
      currentWorldTheme: (profile.current_world_theme === 'emerald_grove'
        || profile.current_world_theme === 'amber_dunes'
        || profile.current_world_theme === 'crystal_depths'
        || profile.current_world_theme === 'aurora_peaks'
        || profile.current_world_theme === 'inferno_core'
          ? profile.current_world_theme
          : 'emerald_grove') as WorldTheme,
      lastPlayedMode: (
        profile.last_played_mode === 'classic'
        || profile.last_played_mode === 'speed_recall'
        || profile.last_played_mode === 'snap_match'
        || profile.last_played_mode === 'sequence'
        || profile.last_played_mode === 'counting_blitz'
        || profile.last_played_mode === 'colour_chain'
          ? (profile.last_played_mode as ModeId)
          : null),
      lastPlayedLevelId: profile.last_played_level_id ?? null,
      hasSeenUnifiedIntro: profile.has_seen_unified_intro === true,
      hasSeenWorldIntro:
        profile.has_seen_world_intro && typeof profile.has_seen_world_intro === 'object'
          ? profile.has_seen_world_intro
          : {},
      hasSeenBrainMaster: profile.has_seen_brain_master === true,
      hasSeenGrandMaster: profile.has_seen_grand_master === true,
    };
  } catch (e) {
    log.error('sync', 'loadProgressFromSupabase threw', e, { userId });
    return null;
  }
}
