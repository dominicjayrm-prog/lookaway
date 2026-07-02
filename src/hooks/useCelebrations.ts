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
// checkStreakMilestone import retired — claim flow lives in claimDueStreakRewards now.
import { checkAchievements, type AchievementUnlock } from '@/src/utils/achievements';
import { scheduleLivesFullNotification } from '@/src/utils/notifications';
import { LIVES_CONFIG, BEGINNER_PROTECTED_CLEARS, FAIL_EFFORT_GEMS } from '@/src/utils/scoring';

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
  // True when a fail cost nothing because the player is still inside
  // the beginner-protection window (< BEGINNER_PROTECTED_CLEARS
  // completed levels). The result screen renders a warm "no life
  // lost — you're still warming up" pill instead of the broken heart.
  const [beginnerProtected, setBeginnerProtected] = useState(false);
  // Gems granted as a consolation on a real (life-costing) fail.
  // 0 when no effort reward was paid (protected / unlimited / shield).
  const [failEffortGems, setFailEffortGems] = useState(0);
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
      // Streak milestone celebration is now handled by the slide-down
      // StreakRewardToast (mounted globally in app/_layout.tsx) — auto
      // claimed via claimDueStreakRewards() in result.tsx. The legacy
      // full-screen modal would double-award gems, so it's disabled here.
      // The component file stays for now in case we want to revive it.

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

    // Starter pack — primary trigger.
    //
    // Old behaviour fired after "World 1 complete", but worlds were
    // unified into one continuous path so that anchor doesn't exist
    // anymore. Level 25 is the closest equivalent: the player's
    // cleared a meaningful chunk, hit their first real difficulty
    // bumps, and is making real progression decisions (lives / gems /
    // power-ups) — peak intent without fatigue.
    //
    // Fires once per device. Backed up by a second-chance trigger
    // when the player hits 0 lives for the first time
    // (see triggerFailCelebrations).
    if (!isReplay) {
      const totalCompleted = Object.keys(useGameStore.getState().levelProgress).length;
      if (totalCompleted >= 25) {
        (async () => {
          try {
            const [purchased, offered] = await Promise.all([
              AsyncStorage.getItem('starter_pack_purchased'),
              AsyncStorage.getItem('starter_pack_offered_level25'),
            ]);
            if (purchased) return;
            if (offered) return; // already shown the level-25 offer
            safeTimeout(() => {
              setShowStarterPack(true);
              const now = String(Date.now());
              AsyncStorage.setItem('starter_pack_offered_level25', now);
              AsyncStorage.setItem('starter_pack_offered_at', now);
            }, 3000);
          } catch {}
        })();
      }
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
    const state = useGameStore.getState();
    // Blanked+ subscribers and the unlimited-lives boost both get a free
    // pass — no life lost, no extra_life power-up consumed, no "life lost"
    // pill on the result screen. The retry button still shows.
    const hasUnlimited = state.subscriptionStatus === 'active'
      || (!!state.unlimitedLivesUntil && Date.now() < state.unlimitedLivesUntil);
    if (hasUnlimited) return;

    // Beginner protection: no life loss and no extra_life consumption
    // while the player is still learning (mirrors the guard inside
    // loseLife, but caught here too so the power-up isn't burned and
    // the result screen can show warm copy instead of a broken heart).
    const clears = Object.keys(state.levelProgress).length;
    if (clears < BEGINNER_PROTECTED_CLEARS) {
      setBeginnerProtected(true);
      return;
    }

    const hasExtraLife = state.getPowerUpCount('extra_life') > 0;
    if (hasExtraLife) {
      useGameStore.getState().usePowerUp('extra_life');
      setExtraLifeSaved(true);
    } else {
      useGameStore.getState().loseLife();
      // Consolation gems on a REAL fail — the fail used to pay zero
      // AND cost a life, a double punishment for the struggling
      // players the game most needs to keep. Paid only when a life
      // was actually lost, so it can't be farmed faster than the
      // lives wall allows.
      useGameStore.getState().addGems(FAIL_EFFORT_GEMS);
      setFailEffortGems(FAIL_EFFORT_GEMS);
      const state = useGameStore.getState();
      scheduleLivesFullNotification(state.lives, state.maxLives, LIVES_CONFIG.regenTimeMinutes);

      // Second-chance starter-pack trigger. The first time a player
      // hits 0 lives is peak intent for the lives + power-ups bundle —
      // they're frustrated and the offer reads as relief. Fires once
      // per device max, gated separately from the level-25 trigger so
      // a player who saw the level-25 offer but didn't buy still gets
      // this one shot.
      if (state.lives === 0) {
        (async () => {
          try {
            const [purchased, offered] = await Promise.all([
              AsyncStorage.getItem('starter_pack_purchased'),
              AsyncStorage.getItem('starter_pack_offered_zero_lives'),
            ]);
            if (purchased || offered) return;
            safeTimeout(() => {
              setShowStarterPack(true);
              const now = String(Date.now());
              AsyncStorage.setItem('starter_pack_offered_zero_lives', now);
              AsyncStorage.setItem('starter_pack_offered_at', now);
            }, 1500);
          } catch {}
        })();
      }
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
    beginnerProtected, failEffortGems,
    showWorldComplete, showFirstLevel, showCampaignComplete, showMilestone, showStarterPack,
    // Setters (for dismissing)
    setCelebration, setShowNotifPrompt, setAchievementUnlocks,
    setShowWorldComplete, setShowFirstLevel, setShowCampaignComplete, setShowMilestone, setShowStarterPack,
    // Triggers
    triggerPassCelebrations, triggerFailCelebrations, triggerNotifPrompt,
  };
}
