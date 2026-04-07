/**
 * useCelebrations — extracts celebration state and trigger logic from result screen.
 * Manages: streak milestones, first level, world complete, campaign complete, level milestones,
 * achievements, notification prompt, and starter pack popup.
 */
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '@/src/store';
import { useAuth } from '@/src/providers/AuthProvider';
import { checkStreakMilestone } from '@/src/data/streakMilestones';
import { checkAchievements, type AchievementUnlock } from '@/src/utils/achievements';
import { scheduleLivesFullNotification } from '@/src/utils/notifications';
import { LIVES_CONFIG } from '@/src/utils/scoring';

interface CelebrationState {
  celebration: { days: number; gems: number; title: string; color: string } | null;
  showNotifPrompt: boolean;
  achievementUnlocks: AchievementUnlock[];
  extraLifeSaved: boolean;
  showWorldComplete: boolean;
  showFirstLevel: boolean;
  showCampaignComplete: boolean;
  showMilestone: boolean;
  showStarterPack: boolean;
}

type SafeTimeout = (fn: () => void, ms: number) => void;

export function useCelebrations() {
  const [celebration, setCelebration] = useState<CelebrationState['celebration']>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlock[]>([]);
  const [extraLifeSaved, setExtraLifeSaved] = useState(false);
  const [showWorldComplete, setShowWorldComplete] = useState(false);
  const [showFirstLevel, setShowFirstLevel] = useState(false);
  const [showCampaignComplete, setShowCampaignComplete] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const { user } = useAuth();

  /** Trigger celebrations after a successful level completion */
  const triggerPassCelebrations = useCallback((
    isReplay: boolean,
    isLastLevelOfWorld: boolean,
    addGems: (n: number) => void,
    safeTimeout: SafeTimeout,
    worldId?: number,
  ) => {
    safeTimeout(() => {
      const newStreak = useGameStore.getState().streakCount;
      const claimed = useGameStore.getState().streakMilestonesClaimed;
      const milestone = checkStreakMilestone(newStreak, claimed);
      if (milestone) setCelebration(milestone);

      const totalCompleted = Object.keys(useGameStore.getState().levelProgress).length;

      if (totalCompleted === 1 && !isReplay) {
        safeTimeout(() => setShowFirstLevel(true), 1200);
      } else if (isLastLevelOfWorld && !isReplay) {
        if (totalCompleted >= 200) {
          safeTimeout(() => setShowCampaignComplete(true), 1200);
        } else {
          safeTimeout(() => setShowWorldComplete(true), 1200);
        }
      } else if ([10, 25, 50, 100, 150, 200].includes(totalCompleted) && !isReplay) {
        safeTimeout(() => setShowMilestone(true), 1000);
      }
    }, 100);

    // Starter pack — show after completing World 1 of Classic (24hr window)
    if (isLastLevelOfWorld && !isReplay && worldId && worldId <= 2) {
      (async () => {
        try {
          const [purchased, offeredAt] = await Promise.all([
            AsyncStorage.getItem('starter_pack_purchased'),
            AsyncStorage.getItem('starter_pack_offered_at'),
          ]);
          if (purchased) return; // Already bought
          if (offeredAt) {
            // Check 24hr expiry
            const elapsed = Date.now() - parseInt(offeredAt, 10);
            if (elapsed > 24 * 60 * 60 * 1000) return; // Expired
          }
          // Show after world complete celebration dismisses (3s delay)
          safeTimeout(() => {
            setShowStarterPack(true);
            if (!offeredAt) AsyncStorage.setItem('starter_pack_offered_at', String(Date.now()));
          }, 3000);
        } catch {}
      })();
    }

    // Achievement check
    if (user?.id) {
      const worldLevelCounts = [20, 30, 35, 35, 40, 40];
      const lp = useGameStore.getState().levelProgress;
      const totalCompleted = Object.keys(lp).length;
      let worldsComplete = 0;
      let perfectWorlds = 0;
      for (let w = 0; w < 6; w++) {
        const prefix = `w${w + 1}-l`;
        const wLevels = Array.from({ length: worldLevelCounts[w] }, (_, i) => lp[`${prefix}${i + 1}`]);
        if (wLevels.every(l => l)) { worldsComplete++; if (wLevels.every(l => l && l.stars >= 3)) perfectWorlds++; }
      }
      checkAchievements(user.id, { type: 'level_complete', data: { totalLevelsCompleted: totalCompleted, totalWorldsCompleted: worldsComplete, totalPerfectWorlds: perfectWorlds } }).then(unlocks => {
        if (unlocks.length > 0) {
          const totalGems = unlocks.reduce((s, u) => s + u.gems, 0);
          if (totalGems > 0) addGems(totalGems);
          safeTimeout(() => setAchievementUnlocks(unlocks), 1200);
        }
      });
    }
  }, [user?.id]);

  /** Handle failure — extra life check, life loss, starter pack */
  const triggerFailCelebrations = useCallback((safeTimeout: SafeTimeout) => {
    const hasExtraLife = useGameStore.getState().getPowerUpCount('extra_life') > 0;
    if (hasExtraLife) {
      useGameStore.getState().usePowerUp('extra_life');
      setExtraLifeSaved(true);
    } else {
      useGameStore.getState().loseLife();
      const state = useGameStore.getState();
      scheduleLivesFullNotification(state.lives, state.maxLives, LIVES_CONFIG.regenTimeMinutes);
    }

  }, []);

  /** Notification prompt (native only, after level 1 or 5) */
  const triggerNotifPrompt = useCallback((safeTimeout: SafeTimeout) => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const asked = await AsyncStorage.getItem('blanked_notifications_asked');
        const declined = await AsyncStorage.getItem('blanked_notifications_declined_count');
        const completedCount = Object.keys(useGameStore.getState().levelProgress).length;
        if (!asked && (completedCount === 1 || completedCount === 5)) {
          const declinedNum = parseInt(declined ?? '0');
          if (declinedNum < 2) safeTimeout(() => setShowNotifPrompt(true), 1500);
        }
      } catch {}
    })();
  }, []);

  return {
    // State
    celebration, showNotifPrompt, achievementUnlocks, extraLifeSaved,
    showWorldComplete, showFirstLevel, showCampaignComplete, showMilestone, showStarterPack,
    // Setters (for dismissing)
    setCelebration, setShowNotifPrompt, setAchievementUnlocks,
    setShowWorldComplete, setShowFirstLevel, setShowCampaignComplete, setShowMilestone, setShowStarterPack,
    // Triggers
    triggerPassCelebrations, triggerFailCelebrations, triggerNotifPrompt,
  };
}
