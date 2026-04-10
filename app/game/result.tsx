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
import { WORLD_LEVEL_COUNTS, WORLD_NAMES, WORLD_COLORS } from '@/src/data/worldPaths';
import { StreakCelebration } from '@/src/components/StreakCelebration';
import { NotificationPrompt } from '@/src/components/NotificationPrompt';
import { logActivity } from '@/src/utils/activity';
import { requestNotificationPermission, registerPushToken, cancelStreakReminder, scheduleStreakReminder } from '@/src/utils/notifications';
import { recordLevelCompleteForChallenges, recordLevelFailedForChallenges, type WeeklyChallenge } from '@/src/utils/weeklyChallenges';
import { FriendRequestToast } from '@/src/components/FriendRequestToast';
import StarterPackPopup from '@/src/components/StarterPackPopup';
import { AchievementToast } from '@/src/components/AchievementToast';
import { useCelebrations } from '@/src/hooks/useCelebrations';
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

// ── Sub-components ────────────────────────────────────────────────────
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
    <RNAnimated.View style={[st.gemReward, { opacity, transform: [{ scale }] }]}>
      <View style={[st.gemRewardPill, { backgroundColor: colors.goldSoft }]}>
        <Text style={st.gemRewardIcon}>{GEM}</Text>
        <Text style={[st.gemRewardText, { color: colors.gold }]}>{text}</Text>
      </View>
    </RNAnimated.View>
  );
}

function AnimatedScore({ value, style }: { value: number; style: object }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value]);
  return <Text style={style}>{display}%</Text>;
}

// ── Main Screen ───────────────────────────────────────────────────────
function ResultScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { score, answers, currentLevel, gameState, resetGame, recordLevelComplete, addStars, incrementStreak, addGems, levelProgress, levelPowerUpsUsed, sessionLevelCount, bumpSessionLevelCount } = useGameStore();
  const [challengeToast, setChallengeToast] = useState<WeeklyChallenge | null>(null);
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

  const celeb = useCelebrations();

  const parsed = level ? parseLevelId(level.id) : null;
  const worldId = parsed?.worldId ?? 1;
  const levelNum = parsed?.levelNum ?? 1;
  const worldTotalLevels = WORLD_LEVEL_COUNTS[worldId] ?? 20;
  const isLastLevelOfWorld = levelNum === worldTotalLevels;
  const nextWorldId = worldId < 6 ? worldId + 1 : null;
  const nextWorldName = nextWorldId ? WORLD_NAMES[nextWorldId] : null;
  const nextLevelId = !isLastLevelOfWorld ? `w${worldId}-l${levelNum + 1}` : null;

  // ── Process level result (runs once) ──
  useEffect(() => {
    if (processed || !level) return;
    setProcessed(true);
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const safeTimeout = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (mounted) fn(); }, ms);
      timers.push(t);
    };

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

      // Bump the in-memory session counter BEFORE handing off to the
      // weekly tracker, so `endurance_8` can see the updated value.
      bumpSessionLevelCount();
      const newSessionCount = useGameStore.getState().sessionLevelCount;
      const correctAnswers = answers.filter((a) => a.isCorrect).length;

      // Single consolidated call — updates all 15 weekly counters in
      // one read-modify-write and returns any goals that just crossed
      // their target so we can pop a toast.
      recordLevelCompleteForChallenges({
        levelId: level.id,
        stars,
        previousStars: existing?.stars ?? 0,
        score,
        correctAnswers,
        powerUpsUsed: levelPowerUpsUsed,
        sessionLevelCount: newSessionCount,
      })
        .then((newlyCompleted) => {
          if (newlyCompleted.length > 0) setChallengeToast(newlyCompleted[0]);
        })
        .catch(() => {});

      // Activity log
      if (didImprove) {
        logActivity('star_improved', { levelId: level.id, worldId, levelNumber: levelNum, oldStars: existing.stars, newStars: stars });
      } else if (!isReplay) {
        logActivity('level_complete', { levelId: level.id, worldId, levelNumber: levelNum, title: level.title, stars, score });
        if (isLastLevelOfWorld) logActivity('world_complete', { worldId, worldName: WORLD_NAMES[worldId] ?? `World ${worldId}` });
      }

      celeb.triggerPassCelebrations(isReplay, isLastLevelOfWorld, addGems, safeTimeout, worldId);
      cancelStreakReminder();
    } else {
      celeb.triggerFailCelebrations(safeTimeout);
      // Level failed — reset the no_life_loss consecutive streak on the
      // weekly tracker so `no_life_loss_5` restarts from zero.
      recordLevelFailedForChallenges().catch(() => {});
    }

    celeb.triggerNotifPrompt(safeTimeout);

    return () => { mounted = false; timers.forEach(clearTimeout); };
  }, [processed, level, passed, stars, score, recordLevelComplete, addStars, incrementStreak, addGems, levelProgress, celeb, worldId, levelNum, isLastLevelOfWorld]);

  // ── Navigation handlers ──
  const handleNextLevel = () => { resetGame(); if (nextLevelId) router.replace(`/game/${nextLevelId}`); };
  const handleNextWorld = () => { resetGame(); if (nextWorldId) router.replace(`/world/${nextWorldId}`); };
  const handleBackToMap = () => { resetGame(); router.replace(`/world/${worldId}`); };
  const handleRetry = () => { const id = level?.id; resetGame(); if (id) router.replace(`/game/${id}`); else router.replace(`/world/${worldId}`); };

  let gemText: string | null = null;
  if (passed && gemsEarned > 0) {
    if (!wasReplay) gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''}`;
    else if (improved) gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''} (star improvement!)`;
  }

  // ── Render ──
  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={st.content}>
        {passed ? (
          <>
            <Text style={[st.completeTitle, { color: colors.correct }]}>Level complete!</Text>
            {isPerfect && <View style={st.perfectBadge}><Text style={st.perfectText}>PERFECT!</Text></View>}
            <View style={{ position: 'relative' }}>
              <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />
              <ThreeStarBurst trigger={passed} stars={stars} />
            </View>
            <AnimatedScore value={score} style={[st.scoreText, { color: colors.text }]} />
            <Text style={[st.scoreLabel, { color: colors.textMid }]}>{correctCount}/{totalCount} correct</Text>
            <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 4 }}>90%+ = 3 stars · 70%+ = 2 stars · 50%+ = pass</Text>
            {gemText && <GemRewardAnimation text={gemText} colors={colors} />}
            {gemsEarned === 0 && wasReplay && !improved && <Text style={[st.noGemsText, { color: colors.textLight }]}>Already completed {'\u2014'} improve your stars to earn more gems!</Text>}
            {isLastLevelOfWorld && (
              <View style={st.worldCompleteBanner}>
                <Text style={st.worldCompleteEmoji}>{PARTY}</Text>
                <Text style={[st.worldCompleteTitle, { color: colors.accent }]}>{WORLD_NAMES[worldId]} Complete!</Text>
                {nextWorldName && <Text style={[st.worldCompleteSubtitle, { color: colors.textMid }]}>{nextWorldName} unlocked!</Text>}
              </View>
            )}
            <View style={st.buttons}>
              {isLastLevelOfWorld ? (
                nextWorldId ? (
                  <Pressable style={st.primaryButton} onPress={handleNextWorld}><Text style={st.primaryButtonText}>Continue to {nextWorldName}</Text></Pressable>
                ) : (
                  <Pressable style={st.primaryButton} onPress={handleBackToMap}><Text style={st.primaryButtonText}>Back to map</Text></Pressable>
                )
              ) : (
                <Pressable style={st.primaryButton} onPress={handleNextLevel}><Text style={st.primaryButtonText}>Next Level</Text></Pressable>
              )}
              <Pressable style={st.secondaryLink} onPress={handleBackToMap}><Text style={[st.secondaryLinkText, { color: colors.accent }]}>Back to map</Text></Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[st.failedTitle, { color: colors.wrong }]}>Not quite...</Text>
            <Text style={[st.scoreText, { color: colors.text }]}>{correctCount}/{totalCount} correct</Text>
            {celeb.extraLifeSaved ? (
              <View style={[st.lifeLostPill, { backgroundColor: colors.correctSoft }]}><Text style={st.lifeLostIcon}>{'\u2764\uFE0F\u200D\uD83D\uDD25'}</Text><Text style={[st.lifeLostText, { color: colors.correct }]}>Extra Life saved you!</Text></View>
            ) : (
              <View style={[st.lifeLostPill, { backgroundColor: colors.wrongSoft }]}><Text style={st.lifeLostIcon}>{HEART}</Text><Text style={[st.lifeLostText, { color: colors.wrong }]}>-1 life</Text></View>
            )}
            {level && <Text style={[st.requireText, { color: colors.textMid }]}>You need {level.requiredScore}% to pass</Text>}
            <View style={st.buttons}>
              <Pressable style={st.primaryButton} onPress={handleRetry}><Text style={st.primaryButtonText}>Try again</Text></Pressable>
              <Pressable style={st.secondaryLink} onPress={handleBackToMap}><Text style={[st.secondaryLinkText, { color: colors.accent }]}>Back to map</Text></Pressable>
            </View>
          </>
        )}
      </View>

      {/* ── Celebration overlays ── */}
      {celeb.achievementUnlocks.length > 0 && (
        <AchievementToast unlocks={celeb.achievementUnlocks} onDismiss={() => celeb.setAchievementUnlocks([])} onTap={() => { celeb.setAchievementUnlocks([]); router.push('/profile'); }} />
      )}

      {/* Weekly challenge completion toast */}
      <FriendRequestToast
        visible={!!challengeToast}
        tone="success"
        title={`${challengeToast?.icon ?? '\u{1F3C6}'} Challenge complete!`}
        subtitle={challengeToast ? `${challengeToast.title} \u2014 +${challengeToast.gems} gems` : undefined}
        onDismiss={() => setChallengeToast(null)}
      />

      <NotificationPrompt
        visible={celeb.showNotifPrompt}
        onEnable={async () => {
          celeb.setShowNotifPrompt(false);
          const granted = await requestNotificationPermission();
          try { const AS = require('@react-native-async-storage/async-storage').default; await AS.setItem('blanked_notifications_asked', 'true'); } catch {}
          if (granted) {
            // The store exposes the authenticated user id as
            // `_authUserId` (set by CloudSyncLoader), not a `user`
            // object — the previous `(store as { user?: {id?: string} })`
            // cast was returning undefined and silently skipping the
            // push token registration every time.
            const uid = useGameStore.getState()._authUserId;
            if (uid) { await registerPushToken(uid); const streak = useGameStore.getState().streakCount; if (streak >= 3) scheduleStreakReminder(streak); }
          }
        }}
        onDismiss={async () => {
          celeb.setShowNotifPrompt(false);
          try { const AS = require('@react-native-async-storage/async-storage').default; const cur = parseInt((await AS.getItem('blanked_notifications_declined_count')) ?? '0'); await AS.setItem('blanked_notifications_declined_count', String(cur + 1)); if (cur + 1 >= 2) await AS.setItem('blanked_notifications_asked', 'true'); } catch {}
        }}
      />

      {celeb.celebration && (
        <StreakCelebration
          visible
          days={celeb.celebration.days}
          gems={celeb.celebration.gems}
          title={celeb.celebration.title}
          color={celeb.celebration.color}
          onDismiss={() => {
            addGems(celeb.celebration!.gems);
            logActivity('streak_milestone', { days: celeb.celebration!.days, gems: celeb.celebration!.gems, title: celeb.celebration!.title });
            useGameStore.setState((s) => ({ streakMilestonesClaimed: [...s.streakMilestonesClaimed, celeb.celebration!.days] }));
            celeb.setCelebration(null);
          }}
        />
      )}

      <FirstLevelCelebration visible={celeb.showFirstLevel} onDismiss={() => celeb.setShowFirstLevel(false)} />
      <WorldCompleteCelebration
        visible={celeb.showWorldComplete}
        worldNumber={worldId}
        worldName={WORLD_NAMES[worldId] ?? `World ${worldId}`}
        worldColor={WORLD_COLORS[worldId] ?? '#00B894'}
        starsEarned={Object.entries(levelProgress).filter(([k]) => k.startsWith(`w${worldId}-`)).reduce((s, [, v]) => s + (v?.stars ?? 0), 0)}
        totalStars={worldTotalLevels * 3}
        isPerfect={Object.entries(levelProgress).filter(([k]) => k.startsWith(`w${worldId}-`)).every(([, v]) => v?.stars >= 3)}
        nextWorldName={nextWorldName ?? undefined}
        onDismiss={() => celeb.setShowWorldComplete(false)}
      />
      <CampaignCompleteCelebration
        visible={celeb.showCampaignComplete}
        totalStars={Object.values(levelProgress).reduce((s, v) => s + (v?.stars ?? 0), 0)}
        maxStars={600}
        onDismiss={() => celeb.setShowCampaignComplete(false)}
      />
      {celeb.showMilestone && <LevelMilestone levelCount={Object.keys(levelProgress).length} onDone={() => celeb.setShowMilestone(false)} />}
      <StarterPackPopup visible={celeb.showStarterPack} onDismiss={() => celeb.setShowStarterPack(false)} onPurchase={() => { celeb.setShowStarterPack(false); Alert.alert('Starter Pack', 'In-app purchases will be available when RevenueCat is configured.'); }} />
    </SafeAreaView>
  );
}

export default ResultScreen;

const st = StyleSheet.create({
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
