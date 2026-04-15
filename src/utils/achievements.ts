import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────

export interface AchievementTier {
  tier: 'bronze' | 'silver' | 'gold';
  target: number;
  gems: number;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tiers: AchievementTier[];
}

export interface PlayerAchievement {
  achievement_id: string;
  current_progress: number;
  bronze_unlocked_at: string | null;
  silver_unlocked_at: string | null;
  gold_unlocked_at: string | null;
  bronze_gems_claimed: boolean;
  silver_gems_claimed: boolean;
  gold_gems_claimed: boolean;
}

export interface AchievementUnlock {
  achievementId: string;
  achievementName: string;
  tier: 'bronze' | 'silver' | 'gold';
  gems: number;
  description: string;
  icon: string;
}

export type AchievementContext =
  | { type: 'level_complete'; data: { totalLevelsCompleted: number; totalWorldsCompleted: number; totalPerfectWorlds: number } }
  | { type: 'daily_complete'; data: { isPerfect: boolean; totalDailiesCompleted: number; totalPerfectDailies: number } }
  | { type: 'challenge_sent'; data: { totalChallengesSent: number } }
  | { type: 'challenge_won'; data: { totalChallengesWon: number } }
  | { type: 'friend_added'; data: { totalFriends: number } }
  | { type: 'streak_update'; data: { currentStreak: number; streakRebuilt: boolean; totalStreakRebuilds: number } }
  | { type: 'gems_earned'; data: { totalGemsEarned: number } }
  | { type: 'speed_answer'; data: { totalSpeedAnswers: number } }
  | { type: 'speed_recall_high'; data: { totalHighAccuracy: number } };

// ─── Progress Calculator ────────────────────────────────────────────

function calculateProgressUpdates(
  context: AchievementContext,
  progressMap: Record<string, PlayerAchievement>,
): Record<string, number> {
  const updates: Record<string, number> = {};

  switch (context.type) {
    case 'level_complete': {
      const { totalLevelsCompleted, totalWorldsCompleted, totalPerfectWorlds } = context.data;
      updates['level_grinder'] = totalLevelsCompleted;
      updates['world_traveller'] = totalWorldsCompleted;
      updates['perfectionist'] = totalPerfectWorlds;
      break;
    }
    case 'daily_complete': {
      const { totalDailiesCompleted, totalPerfectDailies } = context.data;
      updates['daily_devotee'] = totalDailiesCompleted;
      updates['memory_master'] = totalPerfectDailies;
      break;
    }
    case 'challenge_sent': {
      updates['social_butterfly'] = context.data.totalChallengesSent;
      break;
    }
    case 'challenge_won': {
      updates['champion'] = context.data.totalChallengesWon;
      break;
    }
    case 'friend_added': {
      updates['popular'] = context.data.totalFriends;
      break;
    }
    case 'streak_update': {
      const { currentStreak, totalStreakRebuilds } = context.data;
      updates['streak_legend'] = currentStreak;
      if (context.data.streakRebuilt) {
        updates['comeback_kid'] = totalStreakRebuilds;
      }
      break;
    }
    case 'gems_earned': {
      updates['collector'] = context.data.totalGemsEarned;
      break;
    }
    case 'speed_answer': {
      updates['speed_demon'] = context.data.totalSpeedAnswers;
      break;
    }
    case 'speed_recall_high': {
      updates['eagle_eye'] = context.data.totalHighAccuracy;
      break;
    }
  }

  return updates;
}

// ─── Main Check Function ────────────────────────────────────────────

let _cachedAchievements: Achievement[] | null = null;

async function getAchievements(): Promise<Achievement[]> {
  if (_cachedAchievements) return _cachedAchievements;
  const { data } = await supabase.from('achievements').select('*');
  _cachedAchievements = (data ?? []) as Achievement[];
  return _cachedAchievements;
}

export async function checkAchievements(
  userId: string,
  context: AchievementContext,
): Promise<AchievementUnlock[]> {
  const unlocks: AchievementUnlock[] = [];

  try {
    const [achievements, progressRows] = await Promise.all([
      getAchievements(),
      supabase.from('player_achievements').select('*').eq('user_id', userId).then(r => r.data ?? []),
    ]);

    const progressMap: Record<string, PlayerAchievement> = {};
    progressRows.forEach((p: any) => { progressMap[p.achievement_id] = p; });

    const updates = calculateProgressUpdates(context, progressMap);

    for (const [achievementId, newProgress] of Object.entries(updates)) {
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement) continue;

      const existing = progressMap[achievementId];
      const currentProgress = existing?.current_progress ?? 0;
      if (newProgress <= currentProgress) continue;

      const tiers: AchievementTier[] = achievement.tiers;
      const upsertData: Record<string, unknown> = {
        user_id: userId,
        achievement_id: achievementId,
        current_progress: newProgress,
        updated_at: new Date().toISOString(),
      };

      for (const tier of tiers) {
        const unlockedKey = `${tier.tier}_unlocked_at` as keyof PlayerAchievement;
        const alreadyUnlocked = existing?.[unlockedKey];

        if (!alreadyUnlocked && newProgress >= tier.target) {
          upsertData[unlockedKey as string] = new Date().toISOString();
          unlocks.push({
            achievementId,
            achievementName: achievement.name,
            tier: tier.tier,
            gems: tier.gems,
            description: tier.description,
            icon: achievement.icon,
          });
        }
      }

      await supabase.from('player_achievements').upsert(
        upsertData,
        { onConflict: 'user_id,achievement_id' },
      );
    }

    // Fire push notifications for any tiers that unlocked in this
    // pass. Fire-and-forget — we shouldn't block the player's
    // gameplay flow on a notification send. `notifyUser` already
    // respects the user's `achievements` preference and the daily
    // rate limit, so we don't have to filter here.
    if (unlocks.length > 0) {
      const { notifyAchievementUnlocked } = await import('@/src/utils/notifications');
      for (const u of unlocks) {
        const tierLabel = u.tier.charAt(0).toUpperCase() + u.tier.slice(1);
        notifyAchievementUnlocked(userId, u.achievementName, tierLabel, u.gems).catch(() => {});
      }
    }
  } catch (e) {
    log.error('achievements', 'checkAchievements threw', e);
  }

  return unlocks;
}

// ─── Data Loading ───────────────────────────────────────────────────

export async function loadAllAchievements(): Promise<Achievement[]> {
  return getAchievements();
}

export async function loadPlayerProgress(userId: string): Promise<Record<string, PlayerAchievement>> {
  const { data } = await supabase
    .from('player_achievements')
    .select('*')
    .eq('user_id', userId);

  const map: Record<string, PlayerAchievement> = {};
  (data ?? []).forEach((p: any) => { map[p.achievement_id] = p; });
  return map;
}

// ─── Stats Helpers (for gathering context data) ─────────────────────

export async function getAchievementStats(userId: string) {
  const { data: progress } = await supabase
    .from('user_progress')
    .select('level_id, stars')
    .eq('user_id', userId);

  const worldLevels = [20, 30, 35, 35, 40, 40];
  let totalLevelsCompleted = progress?.length ?? 0;
  let totalWorldsCompleted = 0;
  let totalPerfectWorlds = 0;

  for (let w = 0; w < 6; w++) {
    const prefix = `w${w + 1}-l`;
    const worldProgress = (progress ?? []).filter(p => p.level_id.startsWith(prefix));
    if (worldProgress.length >= worldLevels[w]) {
      totalWorldsCompleted++;
      if (worldProgress.every(p => p.stars >= 3)) totalPerfectWorlds++;
    }
  }

  const [sentResult, wonResult, friendsResult] = await Promise.all([
    supabase.from('friend_challenges').select('id', { count: 'exact', head: true }).eq('challenger_id', userId),
    supabase.from('friend_challenges').select('id', { count: 'exact', head: true }).eq('status', 'completed')
      .or(`and(challenger_id.eq.${userId},challenger_score.gt.challenged_score),and(challenged_id.eq.${userId},challenged_score.gt.challenger_score)`),
    supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);

  return {
    totalLevelsCompleted,
    totalWorldsCompleted,
    totalPerfectWorlds,
    totalChallengesSent: sentResult.count ?? 0,
    totalChallengesWon: wonResult.count ?? 0,
    totalFriends: friendsResult.count ?? 0,
  };
}

// ─── Tier Helpers ───────────────────────────────────────────────────

export const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#B2BEC3',
  gold: '#D4A012',
  none: 'rgba(0,0,0,0.06)',
};

export function getHighestUnlockedTier(progress: PlayerAchievement | undefined): 'bronze' | 'silver' | 'gold' | null {
  if (progress?.gold_unlocked_at) return 'gold';
  if (progress?.silver_unlocked_at) return 'silver';
  if (progress?.bronze_unlocked_at) return 'bronze';
  return null;
}

export function countUnlockedTiers(progressMap: Record<string, PlayerAchievement>): number {
  let count = 0;
  for (const p of Object.values(progressMap)) {
    if (p.bronze_unlocked_at) count++;
    if (p.silver_unlocked_at) count++;
    if (p.gold_unlocked_at) count++;
  }
  return count;
}
