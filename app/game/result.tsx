import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StarRating } from '@/src/components/StarRating';
import ThreeStarBurst from '@/src/components/ThreeStarBurst';
import WorldCompleteCelebration from '@/src/components/WorldCompleteCelebration';
import FirstLevelCelebration from '@/src/components/FirstLevelCelebration';
import CampaignCompleteCelebration from '@/src/components/CampaignCompleteCelebration';
import LevelMilestone from '@/src/components/LevelMilestone';
import { useGameStore } from '@/src/store';
import { getStarsForScore } from '@/src/utils/scoring';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { WORLD_LEVEL_COUNTS, WORLD_NAMES, WORLD_COLORS } from '@/src/data/worldPaths';
import { checkStreakMilestone } from '@/src/data/streakMilestones';
import { StreakCelebration } from '@/src/components/StreakCelebration';
import { NotificationPrompt } from '@/src/components/NotificationPrompt';
import { logActivity } from '@/src/utils/activity';
import { requestNotificationPermission, registerPushToken, cancelStreakReminder, scheduleStreakReminder, scheduleLivesFullNotification } from '@/src/utils/notifications';
import { incrementWeeklyProgress, setWeeklyProgressMax } from '@/src/utils/weeklyChallenges';
import StarterPackPopup from '@/src/components/StarterPackPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAchievements, type AchievementUnlock } from '@/src/utils/achievements';
import { AchievementToast } from '@/src/components/AchievementToast';
import { LIVES_CONFIG } from '@/src/utils/scoring';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

const GEM = String.fromCodePoint(0x1f48e);
const HEART = String.fromCodePoint(0x1f494);
const PARTY = String.fromCodePoint(0x1f389);

function parseLevelId(id: string): { worldId: number; levelNum: number } | null {
  const m = id.match(/^w(\d+)-l(\d+)$/);
  if (!m) return null;
  return { worldId: parseInt(m[1], 10), levelNum: parseInt(m[2], 10) };
}

function GemRewardAnimation({ text, colors }: { text: string; colors: Record<string, string> }) {
  const scale = useRef(new RNAnimated.Value(0.8)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 500);
    return () => clearTimeout(timer);
  }, [scale, opacity]);
  return (
    <RNAnimated.View style={[styles.gemReward, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.gemRewardPill, { backgroundColor: colors.goldSoft }]}>
        <Text style={styles.gemRewardIcon}>{GEM}</Text>
        <Text style={[styles.gemRewardText, { color: colors.gold }]}>{text}</Text>
      </View>
    </RNAnimated.View>
  );
}

/** Animated counter that counts up from 0 to `value` with easing */
function AnimatedScore({ value, style }: { value: number; style: any }) {
  var [display, setDisplay] = useState(0);
  useEffect(() => {
    var start = Date.now();
    var duration = 900;
    var frame = () => {
      var elapsed = Date.now() - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value]);
  return <Text style={style}>{display}%</Text>;
}

function ResultScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { score, answers, currentLevel, gameState, resetGame, recordLevelComplete, loseLife, addStars, incrementStreak, addGems, levelProgress, streakCount, streakMilestonesClaimed } = useGameStore();
  const level = currentLevel;
  const passed = gameState === 'COMPLETE';
  const stars = level ? getStarsForScore(score, level) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;
  const isPerfect = totalCount > 0 && correctCount === totalCount;

  const [gemsEarned, setGemsEarned] = useState(0);
  const [wasReplay, setWasReplay] = useState(false);
  const [improved, setImproved] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [celebration, setCelebration] = useState<{ days: number; gems: number; title: string; color: string } | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlock[]>([]);
  const [extraLifeSaved, setExtraLifeSaved] = useState(false);
  const [showWorldComplete, setShowWorldComplete] = useState(false);
  const [showFirstLevel, setShowFirstLevel] = useState(false);
  const [showCampaignComplete, setShowCampaignComplete] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const { user } = useAuth();

  const parsed = level ? parseLevelId(level.id) : null;
  const worldId = parsed?.worldId ?? 1;
  const levelNum = parsed?.levelNum ?? 1;
  const worldTotalLevels = WORLD_LEVEL_COUNTS[worldId] ?? 20;
  const isLastLevelOfWorld = levelNum === worldTotalLevels;
  const nextWorldId = worldId < 6 ? worldId + 1 : null;
  const nextWorldName = nextWorldId ? WORLD_NAMES[nextWorldId] : null;
  const nextLevelId = !isLastLevelOfWorld ? `w${worldId}-l${levelNum + 1}` : null;

  useEffect(() => {
    if (processed || !level) return;
    setProcessed(true);

    if (passed) {
      const existing = levelProgress[level.id];
      const isReplay = !!existing && existing.stars > 0;
      const didImprove = isReplay && stars > existing.stars;
      setWasReplay(isReplay);
      setImproved(didImprove);
      const earned = recordLevelComplete(level.id, stars, score);
      setGemsEarned(earned);
      if (stars > 0) addStars(stars);
      incrementStreak();

      // Track weekly challenge progress
      incrementWeeklyProgress('levels_completed');
      if (stars > 0) incrementWeeklyProgress('stars_earned', stars);
      if (stars === 3) incrementWeeklyProgress('perfect_levels');
      if (score >= 90) incrementWeeklyProgress('high_score_levels');

      if (didImprove) {
        logActivity('star_improved', { levelId: level.id, worldId, levelNumber: levelNum, oldStars: existing.stars, newStars: stars });
      } else if (!isReplay) {
        logActivity('level_complete', { levelId: level.id, worldId, levelNumber: levelNum, title: level.title, stars, score });
        if (isLastLevelOfWorld) logActivity('world_complete', { worldId, worldName: WORLD_NAMES[worldId] ?? `World ${worldId}` });
      }

      setTimeout(() => {
        const newStreak = useGameStore.getState().streakCount;
        const claimed = useGameStore.getState().streakMilestonesClaimed;
        const milestone = checkStreakMilestone(newStreak, claimed);
        if (milestone) setCelebration(milestone);

        // Celebration triggers (checked after delay to let main UI render first)
        const totalCompleted2 = Object.keys(useGameStore.getState().levelProgress).length;

        // First level ever completed
        if (totalCompleted2 === 1 && !isReplay) {
          setTimeout(() => setShowFirstLevel(true), 1200);
        }
        // World complete
        else if (isLastLevelOfWorld && !isReplay) {
          const allWorldsDone = totalCompleted2 >= 200;
          if (allWorldsDone) {
            setTimeout(() => setShowCampaignComplete(true), 1200);
          } else {
            setTimeout(() => setShowWorldComplete(true), 1200);
          }
        }
        // Level milestones (10, 25, 50, 100, 150, 200)
        else if ([10, 25, 50, 100, 150, 200].includes(totalCompleted2) && !isReplay) {
          setTimeout(() => setShowMilestone(true), 1000);
        }
      }, 100);

      if (user?.id) {
        const totalCompleted = Object.keys(useGameStore.getState().levelProgress).length;
        const worldLevelCounts = [20, 30, 35, 35, 40, 40];
        let worldsComplete = 0;
        let perfectWorlds = 0;
        const lp = useGameStore.getState().levelProgress;
        for (let w = 0; w < 6; w++) {
          const prefix = `w${w + 1}-l`;
          const wLevels = Array.from({ length: worldLevelCounts[w] }, (_, i) => lp[`${prefix}${i + 1}`]);
          if (wLevels.every(l => l)) { worldsComplete++; if (wLevels.every(l => l && l.stars >= 3)) perfectWorlds++; }
        }
        checkAchievements(user.id, { type: 'level_complete', data: { totalLevelsCompleted: totalCompleted, totalWorldsCompleted: worldsComplete, totalPerfectWorlds: perfectWorlds } }).then(unlocks => {
          if (unlocks.length > 0) {
            const totalGems = unlocks.reduce((s, u) => s + u.gems, 0);
            if (totalGems > 0) addGems(totalGems);
            setTimeout(() => setAchievementUnlocks(unlocks), 1200);
          }
        });
      }
    } else {
      // Check for Extra Life power-up before losing a life
      const hasExtraLife = useGameStore.getState().getPowerUpCount('extra_life') > 0;
      if (hasExtraLife) {
        useGameStore.getState().usePowerUp('extra_life');
        // Show a brief message — the "Extra Life saved you!" is shown in the UI via extraLifeSaved state
        setExtraLifeSaved(true);
      } else {
        loseLife();
        const state = useGameStore.getState();
        scheduleLivesFullNotification(state.lives, state.maxLives, LIVES_CONFIG.regenTimeMinutes);
      }
    }

    if (passed) cancelStreakReminder();

    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const asked = await AsyncStorage.getItem('blanked_notifications_asked');
          const declined = await AsyncStorage.getItem('blanked_notifications_declined_count');
          const completedCount = Object.keys(useGameStore.getState().levelProgress).length;
          if (!asked && (completedCount === 1 || completedCount === 5)) {
            const declinedNum = parseInt(declined ?? '0');
            if (declinedNum < 2) setTimeout(() => setShowNotifPrompt(true), 1500);
          }
        } catch {}
      })();
    }
  }, [passed, processed, level, stars, score, recordLevelComplete, loseLife, addStars, levelProgress]);

  const handleNextLevel = () => { resetGame(); if (nextLevelId) router.replace(`/game/${nextLevelId}`); };
  const handleNextWorld = () => { resetGame(); if (nextWorldId) router.replace(`/world/${nextWorldId}`); };
  const handleBackToMap = () => { resetGame(); router.replace(`/world/${worldId}`); };
  const handleRetry = () => { const id = level?.id; resetGame(); if (id) router.replace(`/game/${id}`); else router.replace(`/world/${worldId}`); };

  let gemText: string | null = null;
  if (passed && gemsEarned > 0) {
    if (!wasReplay) gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''}`;
    else if (improved) gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''} (star improvement!)`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        {passed ? (
          <>
            <Text style={[styles.completeTitle, { color: colors.correct }]}>Level complete!</Text>
            {isPerfect && (<View style={styles.perfectBadge}><Text style={styles.perfectText}>PERFECT!</Text></View>)}
            <View style={{ position: 'relative' }}>
              <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />
              <ThreeStarBurst trigger={passed} stars={stars} />
            </View>
            <AnimatedScore value={score} style={[styles.scoreText, { color: colors.text }]} />
            <Text style={[styles.scoreLabel, { color: colors.textMid }]}>{correctCount}/{totalCount} correct</Text>
            {gemText && <GemRewardAnimation text={gemText} colors={colors} />}
            {passed && gemsEarned === 0 && wasReplay && !improved && (<Text style={[styles.noGemsText, { color: colors.textLight }]}>Already completed \u2014 improve your stars to earn more gems!</Text>)}
            {isLastLevelOfWorld && (<View style={styles.worldCompleteBanner}><Text style={styles.worldCompleteEmoji}>{PARTY}</Text><Text style={[styles.worldCompleteTitle, { color: colors.accent }]}>{WORLD_NAMES[worldId]} Complete!</Text>{nextWorldName && (<Text style={[styles.worldCompleteSubtitle, { color: colors.textMid }]}>{nextWorldName} unlocked!</Text>)}</View>)}
            <View style={styles.buttons}>
              {isLastLevelOfWorld ? (nextWorldId ? (<Pressable style={styles.primaryButton} onPress={handleNextWorld}><Text style={styles.primaryButtonText}>Continue to {nextWorldName}</Text></Pressable>) : (<Pressable style={styles.primaryButton} onPress={handleBackToMap}><Text style={styles.primaryButtonText}>Back to map</Text></Pressable>)) : (<Pressable style={styles.primaryButton} onPress={handleNextLevel}><Text style={styles.primaryButtonText}>Next Level</Text></Pressable>)}
              <Pressable style={styles.secondaryLink} onPress={handleBackToMap}><Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to map</Text></Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.failedTitle, { color: colors.wrong }]}>Not quite...</Text>
            <Text style={[styles.scoreText, { color: colors.text }]}>{correctCount}/{totalCount} correct</Text>
            {extraLifeSaved ? (
              <View style={[styles.lifeLostPill, { backgroundColor: colors.correctSoft }]}><Text style={styles.lifeLostIcon}>{'\u2764\uFE0F\u200D\uD83D\uDD25'}</Text><Text style={[styles.lifeLostText, { color: colors.correct }]}>Extra Life saved you!</Text></View>
            ) : (
              <View style={[styles.lifeLostPill, { backgroundColor: colors.wrongSoft }]}><Text style={styles.lifeLostIcon}>{HEART}</Text><Text style={[styles.lifeLostText, { color: colors.wrong }]}>-1 life</Text></View>
            )}
            {level && (<Text style={[styles.requireText, { color: colors.textMid }]}>You need {level.requiredScore}% to pass</Text>)}
            <View style={styles.buttons}>
              <Pressable style={styles.primaryButton} onPress={handleRetry}><Text style={styles.primaryButtonText}>Try again</Text></Pressable>
              <Pressable style={styles.secondaryLink} onPress={handleBackToMap}><Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to map</Text></Pressable>
            </View>
          </>
        )}
      </View>

      {achievementUnlocks.length > 0 && (<AchievementToast unlocks={achievementUnlocks} onDismiss={() => setAchievementUnlocks([])} onTap={() => { setAchievementUnlocks([]); router.push('/profile'); }} />)}

      <NotificationPrompt visible={showNotifPrompt}
        onEnable={async () => { setShowNotifPrompt(false); const granted = await requestNotificationPermission(); try { const AsyncStorage = require('@react-native-async-storage/async-storage').default; await AsyncStorage.setItem('blanked_notifications_asked', 'true'); } catch {} if (granted && user?.id) { await registerPushToken(user.id); const streak = useGameStore.getState().streakCount; if (streak >= 3) scheduleStreakReminder(streak); } }}
        onDismiss={async () => { setShowNotifPrompt(false); try { const AsyncStorage = require('@react-native-async-storage/async-storage').default; const current = parseInt((await AsyncStorage.getItem('blanked_notifications_declined_count')) ?? '0'); await AsyncStorage.setItem('blanked_notifications_declined_count', String(current + 1)); if (current + 1 >= 2) await AsyncStorage.setItem('blanked_notifications_asked', 'true'); } catch {} }}
      />

      {celebration && (<StreakCelebration visible days={celebration.days} gems={celebration.gems} title={celebration.title} color={celebration.color} onDismiss={() => { addGems(celebration.gems); logActivity('streak_milestone', { days: celebration.days, gems: celebration.gems, title: celebration.title }); useGameStore.setState((s) => ({ streakMilestonesClaimed: [...s.streakMilestonesClaimed, celebration.days] })); setCelebration(null); }} />)}

      {/* Premium celebration overlays */}
      <FirstLevelCelebration visible={showFirstLevel} onDismiss={() => setShowFirstLevel(false)} />
      <WorldCompleteCelebration
        visible={showWorldComplete}
        worldNumber={worldId}
        worldName={WORLD_NAMES[worldId] ?? `World ${worldId}`}
        worldColor={WORLD_COLORS[worldId] ?? '#00B894'}
        starsEarned={Object.entries(levelProgress).filter(([k]) => k.startsWith(`w${worldId}-`)).reduce((s, [, v]) => s + (v?.stars ?? 0), 0)}
        totalStars={worldTotalLevels * 3}
        isPerfect={Object.entries(levelProgress).filter(([k]) => k.startsWith(`w${worldId}-`)).every(([, v]) => v?.stars >= 3)}
        nextWorldName={nextWorldName ?? undefined}
        onDismiss={() => {
          setShowWorldComplete(false);
          // Show starter pack after completing first world (world 1 or 2 depending on migration)
          if (worldId <= 2) {
            AsyncStorage.getItem('blanked_starter_pack_shown').then(shown => {
              if (!shown) {
                setTimeout(() => setShowStarterPack(true), 600);
                AsyncStorage.setItem('blanked_starter_pack_shown', 'true');
              }
            });
          }
        }}
      />
      <CampaignCompleteCelebration
        visible={showCampaignComplete}
        totalStars={Object.values(levelProgress).reduce((s, v) => s + (v?.stars ?? 0), 0)}
        maxStars={600}
        onDismiss={() => setShowCampaignComplete(false)}
      />
      {showMilestone && (
        <LevelMilestone
          levelCount={Object.keys(levelProgress).length}
          onDone={() => setShowMilestone(false)}
        />
      )}

      {/* Starter pack popup (after World 1 complete) */}
      <StarterPackPopup
        visible={showStarterPack}
        onDismiss={() => setShowStarterPack(false)}
        onPurchase={() => {
          setShowStarterPack(false);
          Alert.alert('Starter Pack', 'In-app purchases will be available when RevenueCat is configured.');
        }}
      />
    </SafeAreaView>
  );
}

export default ResultScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  completeTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  perfectBadge: { backgroundColor: 'rgba(212, 160, 18, 0.1)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 999 },
  perfectText: { fontSize: 16, fontWeight: '800', letterSpacing: 2, color: '#D4A012' },
  failedTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  lifeLostPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  lifeLostIcon: { fontSize: 18 },
  lifeLostText: { fontSize: 15, fontWeight: '700' },
  scoreText: { fontSize: 48, fontWeight: typography.weights.black, marginTop: 4 },
  scoreLabel: { fontSize: typography.sizes.md, marginTop: -4 },
  requireText: { fontSize: typography.sizes.md },
  gemReward: { alignItems: 'center' },
  gemRewardPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  gemRewardIcon: { fontSize: 20 },
  gemRewardText: { fontSize: 16, fontWeight: '700' },
  noGemsText: { fontSize: typography.sizes.sm, textAlign: 'center', maxWidth: 240 },
  worldCompleteBanner: { alignItems: 'center', marginTop: 4 },
  worldCompleteEmoji: { fontSize: 28 },
  worldCompleteTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  worldCompleteSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  buttons: { width: '100%', maxWidth: 280, marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  primaryButton: { width: '100%', backgroundColor: '#6C5CE7', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryLink: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryLinkText: { fontSize: 14, fontWeight: '600' },
});
