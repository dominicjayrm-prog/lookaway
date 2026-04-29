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
import { claimDueStreakRewards } from '@/src/utils/streakRewards';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import { requestNotificationPermission, registerPushToken, cancelStreakReminder, scheduleStreakReminder } from '@/src/utils/notifications';
import { recordLevelCompleteForChallenges, recordLevelFailedForChallenges, type WeeklyChallenge } from '@/src/utils/weeklyChallenges';
import { FriendRequestToast } from '@/src/components/FriendRequestToast';
import StarterPackPopup from '@/src/components/StarterPackPopup';
import { AchievementToast } from '@/src/components/AchievementToast';
import { useCelebrations } from '@/src/hooks/useCelebrations';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import { maybeShowInterstitial } from '@/src/utils/adService';
import { ModeUnlockCelebration } from '@/src/components/ModeUnlockCelebration';
import { checkModeUnlock } from '@/src/data/modeUnlocks';
import { getMilestonesForLevel, type MilestoneReward } from '@/src/data/milestoneRewards';
import { sounds } from '@/src/lib/sounds';
import { MilestoneGiftCelebration } from '@/src/components/MilestoneGiftCelebration';
import { t } from '@/src/i18n';
import { getMastermindLevel } from '@/src/data/mastermindLevels';

const GEM = String.fromCodePoint(0x1f48e);
const HEART = String.fromCodePoint(0x1f494);
const PARTY = String.fromCodePoint(0x1f389);

function parseLevelId(id: string): { worldId: number; levelNum: number } | null {
  const m = id.match(/^w(\d+)-l(\d+)$/);
  if (!m) return null;
  return { worldId: parseInt(m[1], 10), levelNum: parseInt(m[2], 10) };
}

// ── Sub-components ────────────────────────────────────────────────────
function GemRewardAnimation({ text, doubled, colors }: { text: string; doubled?: boolean; colors: Record<string, string> }) {
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
        {doubled && (
          <View style={[st.doubledBadge, { backgroundColor: colors.gold }]}>
            <Text style={st.doubledBadgeText}>{t('result.plus_doubled_badge')}</Text>
          </View>
        )}
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
  const { score, answers, currentLevel, gameState, resetGame, recordLevelComplete, advanceUnifiedPosition, addStars, incrementStreak, addGems, levelProgress, levelPowerUpsUsed, sessionLevelCount, bumpSessionLevelCount, subscriptionStatus, unlimitedLivesUntil } = useGameStore();
  const hasUnlimitedLives = subscriptionStatus === 'active' || (!!unlimitedLivesUntil && Date.now() < unlimitedLivesUntil);
  const [challengeToast, setChallengeToast] = useState<WeeklyChallenge | null>(null);
  const level = currentLevel;
  const passed = gameState === 'COMPLETE';
  const stars = level ? getStarsForScore(score, level) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;
  const isPerfect = totalCount > 0 && correctCount === totalCount;

  const [gemsEarned, setGemsEarned] = useState(0);
  const [gemsDoubled, setGemsDoubled] = useState(false);
  const [wasReplay, setWasReplay] = useState(false);
  const [improved, setImproved] = useState(false);
  const [processed, setProcessed] = useState(false);

  const celeb = useCelebrations();
  const [modeUnlockId, setModeUnlockId] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<MilestoneReward | null>(null);

  const parsed = level ? parseLevelId(level.id) : null;
  const worldId = parsed?.worldId ?? 1;
  const levelNum = parsed?.levelNum ?? 1;
  const worldTotalLevels = WORLD_LEVEL_COUNTS[worldId] ?? 20;
  const isLastLevelOfWorld = levelNum === worldTotalLevels;
  const nextWorldId = worldId < 6 ? worldId + 1 : null;
  const nextWorldName = nextWorldId ? WORLD_NAMES[nextWorldId] : null;
  // World 6 has the Endgame extension above L40 (Mastermind L41-55 with
  // 5 cross-mode boss levels at unified positions 395-399 between L54 and
  // L55). The "Next Level" CTA increments levelNum by 1 — fine within
  // L41-L54, but at L54→L55 it would skip the bosses, and at L55 it
  // would crash on a non-existent w6-l56. Both branches push the
  // player back to the journey map so the unified ladder takes over.
  const isFinalEndgameLevel = worldId === 6 && levelNum >= 55;
  const isPreBossEndgameLevel = worldId === 6 && levelNum === 54;
  const hasNextMastermind = worldId === 6 && levelNum >= 40 && getMastermindLevel(levelNum + 1) != null;
  const nextLevelId = isFinalEndgameLevel || isPreBossEndgameLevel
    ? null
    : worldId === 6 && levelNum >= 40
      ? (hasNextMastermind ? `w6-l${levelNum + 1}` : null)
      : (!isLastLevelOfWorld ? `w${worldId}-l${levelNum + 1}` : null);

  // ── Process level result (runs once) ──
  useEffect(() => {
    if (processed || !level) return;
    setProcessed(true);
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const safeTimeout = (fn: () => void, ms: number) => {
      const handle = setTimeout(() => { if (mounted) fn(); }, ms);
      timers.push(handle);
    };

    if (passed) {
      sounds.play('levelComplete');
      // Play star pops staggered after a brief delay
      if (stars >= 1) setTimeout(() => sounds.play('starPop'), 600);
      if (stars >= 2) setTimeout(() => sounds.play('starPop'), 900);
      if (stars >= 3) setTimeout(() => sounds.play('starPop'), 1200);
      const existing = levelProgress[level.id];
      const isReplay = !!existing && existing.stars > 0;
      const didImprove = isReplay && stars > existing.stars;
      setWasReplay(isReplay);
      setImproved(didImprove);
      const { earned, doubled } = recordLevelComplete(level.id, stars, score);
      setGemsEarned(earned);
      setGemsDoubled(doubled);
      // Advance the unified ladder cursor only when this IS the player's
      // current ladder position. Replays and Mode-Library side-plays are
      // recorded (stars still awarded) but don't jump the journey forward.
      if (stars > 0) advanceUnifiedPosition(level.id);
      // Gem sound deferred to home/map screen for smoother feel
      if (stars > 0) addStars(stars);
      incrementStreak();

      // Streak rewards: only the first level of the day flips streakCount,
      // so this only does work once per day. The cloud claim flips Supabase
      // rows + grants gems/shields; the result is queued for the toast.
      (async () => {
        const uid = useGameStore.getState()._authUserId;
        const newStreak = useGameStore.getState().streakCount;
        if (!uid || newStreak < 3) return;
        const claimed = await claimDueStreakRewards(uid, newStreak);
        if (claimed.length === 0) return;
        // Sync local mirrors: bump shields, mark days claimed, surface toasts
        const totalShields = claimed.reduce((s, m) => s + m.shields, 0);
        const claimedDays = claimed.map((m) => m.day);
        useGameStore.setState((s) => ({
          streakShields: s.streakShields + totalShields,
          streakMilestonesClaimed: Array.from(new Set([...s.streakMilestonesClaimed, ...claimedDays])),
        }));
        useGameStore.getState().pushStreakRewards(claimed);
      })();

      // Milestone cosmetic check — fires for Classic mode levels
      if (!isReplay) {
        const milestones = getMilestonesForLevel(worldId, levelNum);
        const store = useGameStore.getState();
        for (const ms of milestones) {
          if (!store.ownedCosmetics.includes(ms.itemId)) {
            // Don't toast for Mastermind legendary or Grand Master frame —
            // they have dedicated celebration modals (Brain Master + Grand
            // Master) that double as the "you unlocked X" surface.
            if (ms.itemId === 'expr_mastermind') {
              store.unlockCosmetic(ms.itemId);
              continue;
            }
            if (ms.itemId === 'frame_grand_master') {
              store.unlockCosmetic(ms.itemId);
              continue;
            }
            store.unlockCosmetic(ms.itemId);
            safeTimeout(() => setMilestoneToast(ms), 2000);
            break; // One toast at a time
          }
        }
      }

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

      // Mode unlock check — fires when completing a qualifying world.
      // Classic levels use 'classic' as the mode identifier.
      if (isLastLevelOfWorld && !isReplay) {
        setTimeout(() => sounds.play('celebration'), 1500);
        // Currently unlocked modes = all side campaign keys the player
        // has accessed (tracked via AsyncStorage in the Journey tab).
        // For now, use a simple check: if the mode data file exists in
        // the level cache for a mode, it's been unlocked.
        // TODO: migrate to a proper unlocked_modes field in gameStore.
        const alreadyUnlocked: string[] = [];
        try {
          const stored = typeof localStorage !== 'undefined'
            ? localStorage.getItem('blanked_unlocked_modes')
            : null;
          if (stored) alreadyUnlocked.push(...JSON.parse(stored));
        } catch {}
        const newMode = checkModeUnlock('classic', worldId, alreadyUnlocked);
        if (newMode) {
          // Persist the unlock so it doesn't re-trigger
          try {
            const updated = [...alreadyUnlocked, newMode];
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('blanked_unlocked_modes', JSON.stringify(updated));
            }
          } catch {}
          // Show the celebration after other celebrations have had time
          safeTimeout(() => setModeUnlockId(newMode), 3500);
        }
      }

      // Interstitial ad — fires after every 5th completed level OR
      // on world completion, with guardrails: first 5 levels are
      // ad-free, max 3 per session, never on daily, never on fail.
      // Delayed 2.5s so it doesn't stomp the star animation.
      const totalCompleted = Object.keys(useGameStore.getState().levelProgress).length;
      safeTimeout(() => {
        maybeShowInterstitial({
          isWorldCompletion: isLastLevelOfWorld,
          totalLevelsEverCompleted: totalCompleted,
        });
      }, 2500);

      // "Rate BLANKED" prompt — only on 3-star passes (peak joy) and
      // only if this play was genuinely new or improved (don't prompt
      // on a same-star replay). The store's own gate enforces the
      // level floor, cooldown, already-accepted etc., so we don't
      // duplicate those checks here. 3500ms puts the prompt AFTER
      // the star pops (1200ms) + celebration sound (1500ms).
      //
      // Important: if a streak milestone celebration is queued, SKIP
      // this opportunity. StreakCelebration is its own <Modal> and
      // stacking the review prompt on top of it is a visual mess
      // (plus the streak celebration is already the peak-joy moment
      // the user is processing). We'll catch them on the next 3-star.
      const isJoyful = stars === 3 && (!isReplay || didImprove);
      if (isJoyful) {
        safeTimeout(() => {
          const hasStreakCelebration = useGameStore.getState().streakRewardQueue.length > 0;
          if (hasStreakCelebration) return;
          useGameStore.getState().maybeShowReviewPrompt('level_3_star');
        }, 3500);
      }
    } else {
      sounds.play('levelFail');
      celeb.triggerFailCelebrations(safeTimeout);
      // Level failed — reset the no_life_loss consecutive streak on the
      // weekly tracker so `no_life_loss_5` restarts from zero.
      recordLevelFailedForChallenges().catch(() => {});
    }

    celeb.triggerNotifPrompt(safeTimeout);

    return () => { mounted = false; timers.forEach(clearTimeout); };
  }, [processed, level, passed, stars, score, recordLevelComplete, addStars, incrementStreak, addGems, levelProgress, celeb, worldId, levelNum, isLastLevelOfWorld]);

  // ── Navigation handlers ──
  // Single navigation events only. The previous `dismissAll() +
  // replace()` pattern fired two transitions in the same JS tick,
  // which on iOS produced a "spring glitch" as the pop animation
  // overlapped with the new screen's enter animation. A single
  // `replace` swaps `/game/result` for the destination cleanly using
  // the result screen's own fade animation. Stack cleanup is implicit
  // because result was itself reached via a replace from /game/[levelId],
  // so the stack is just [/(tabs), /game/result] when these fire.
  const handleNextLevel = () => { resetGame(); if (nextLevelId) router.replace(`/game/${nextLevelId}`); };
  const handleNextWorld = () => { resetGame(); if (nextWorldId) router.replace(`/world/${nextWorldId}`); };
  const handleBackToMap = () => { resetGame(); router.replace('/(tabs)/journey'); };
  const handleRetry = () => { const id = level?.id; resetGame(); if (id) router.replace(`/game/${id}`); else router.replace('/(tabs)/journey'); };

  let gemText: string | null = null;
  if (passed && gemsEarned > 0) {
    const isOne = gemsEarned === 1;
    if (!wasReplay) {
      gemText = isOne
        ? t('result.gem_earned_one', { count: gemsEarned })
        : t('result.gem_earned_many', { count: gemsEarned });
    } else if (improved) {
      gemText = isOne
        ? t('result.gem_earned_one_improved', { count: gemsEarned })
        : t('result.gem_earned_many_improved', { count: gemsEarned });
    }
  }

  // ── Render ──
  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={st.content}>
        {passed ? (
          <>
            <Text style={[st.completeTitle, { color: colors.correct }]}>{t('result.level_complete')}</Text>
            {isPerfect && <View style={st.perfectBadge}><Text style={st.perfectText}>{t('result.perfect')}</Text></View>}
            <View style={{ position: 'relative' }}>
              <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />
              <ThreeStarBurst trigger={passed} stars={stars} />
            </View>
            <AnimatedScore value={score} style={[st.scoreText, { color: colors.text }]} />
            <Text style={[st.scoreLabel, { color: colors.textMid }]}>{t('result.correct_count', { correct: correctCount, total: totalCount })}</Text>
            <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 4 }}>{t('result.star_threshold_hint')}</Text>
            {gemText && <GemRewardAnimation text={gemText} doubled={gemsDoubled} colors={colors} />}
            {gemsEarned === 0 && wasReplay && !improved && <Text style={[st.noGemsText, { color: colors.textLight }]}>{t('result.already_completed')}</Text>}
            {isLastLevelOfWorld && (
              <View style={st.worldCompleteBanner}>
                <Text style={st.worldCompleteEmoji}>{PARTY}</Text>
                <Text style={[st.worldCompleteTitle, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('result.world_complete', { world: WORLD_NAMES[worldId] })}</Text>
                {nextWorldName && <Text style={[st.worldCompleteSubtitle, { color: colors.textMid }]}>{t('result.world_unlocked', { world: nextWorldName })}</Text>}
              </View>
            )}
            <View style={st.buttons}>
              {isLastLevelOfWorld ? (
                nextWorldId ? (
                  <Pressable style={st.primaryButton} onPress={handleNextWorld} accessibilityRole="button" accessibilityLabel={t('result.continue_to_world_aria', { world: nextWorldName ?? '' })}><Text style={st.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t('result.continue_to_world', { world: nextWorldName ?? '' })}</Text></Pressable>
                ) : (
                  <Pressable style={st.primaryButton} onPress={handleBackToMap} accessibilityRole="button" accessibilityLabel={t('result.back_to_map_aria')}><Text style={st.primaryButtonText}>{t('result.back_to_map')}</Text></Pressable>
                )
              ) : nextLevelId ? (
                <Pressable style={st.primaryButton} onPress={handleNextLevel} accessibilityRole="button" accessibilityLabel={t('result.next_level_aria')}><Text style={st.primaryButtonText}>{t('result.next_level')}</Text></Pressable>
              ) : (
                <Pressable style={st.primaryButton} onPress={handleBackToMap} accessibilityRole="button" accessibilityLabel={t('result.back_to_map_aria')}><Text style={st.primaryButtonText}>{t('result.back_to_map')}</Text></Pressable>
              )}
              <Pressable style={st.secondaryLink} onPress={handleBackToMap} accessibilityRole="button" accessibilityLabel={t('result.back_to_map_aria')}><Text style={[st.secondaryLinkText, { color: colors.accent }]}>{t('result.back_to_map')}</Text></Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[st.failedTitle, { color: colors.wrong }]}>{t('result.failed_title')}</Text>
            <Text style={[st.scoreText, { color: colors.text }]}>{t('result.correct_count', { correct: correctCount, total: totalCount })}</Text>
            {hasUnlimitedLives ? null : celeb.extraLifeSaved ? (
              <View style={[st.lifeLostPill, { backgroundColor: colors.correctSoft }]}><Text style={st.lifeLostIcon}>{'\u2764\uFE0F\u200D\uD83D\uDD25'}</Text><Text style={[st.lifeLostText, { color: colors.correct }]}>{t('result.extra_life_saved')}</Text></View>
            ) : (
              <View style={[st.lifeLostPill, { backgroundColor: colors.wrongSoft }]}><Text style={st.lifeLostIcon}>{HEART}</Text><Text style={[st.lifeLostText, { color: colors.wrong }]}>{t('result.life_lost')}</Text></View>
            )}
            {level && <Text style={[st.requireText, { color: colors.textMid }]}>{t('result.need_to_pass', { score: level.requiredScore })}</Text>}
            <View style={st.buttons}>
              <Pressable style={st.primaryButton} onPress={handleRetry} accessibilityRole="button" accessibilityLabel={t('result.try_again_aria')}><Text style={st.primaryButtonText}>{t('result.try_again')}</Text></Pressable>
              <Pressable style={st.secondaryLink} onPress={handleBackToMap} accessibilityRole="button" accessibilityLabel={t('result.back_to_map_aria')}><Text style={[st.secondaryLinkText, { color: colors.accent }]}>{t('result.back_to_map')}</Text></Pressable>
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
        title={t('result.challenge_complete_title', { icon: challengeToast?.icon ?? '\u{1F3C6}' })}
        subtitle={challengeToast ? t('result.challenge_complete_sub', { title: challengeToast.title, gems: challengeToast.gems }) : undefined}
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
            const streakGems = celeb.celebration!.gems;
            addGems(streakGems);
            const uid = useGameStore.getState()._authUserId;
            if (uid && streakGems > 0) {
              logEconomyEvent(uid, ECONOMY_EVENTS.GEM_EARN_STREAK, streakGems, {
                days: celeb.celebration!.days,
                title: celeb.celebration!.title,
              });
            }
            logActivity('streak_milestone', { days: celeb.celebration!.days, gems: streakGems, title: celeb.celebration!.title });
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
      <StarterPackPopup visible={celeb.showStarterPack} onDismiss={() => celeb.setShowStarterPack(false)} onPurchase={() => { celeb.setShowStarterPack(false); Alert.alert(t('result.starter_pack_title'), t('result.starter_pack_body')); }} />
      <MilestoneGiftCelebration
        visible={!!milestoneToast}
        itemId={milestoneToast?.itemId ?? ''}
        itemName={milestoneToast?.itemName ?? ''}
        rarity={'rare'}
        category={milestoneToast?.category ?? 'expression'}
        onDismiss={() => setMilestoneToast(null)}
      />
      {modeUnlockId && (
        <ModeUnlockCelebration
          visible={!!modeUnlockId}
          modeId={modeUnlockId}
          onDismiss={() => setModeUnlockId(null)}
        />
      )}
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
  doubledBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 4 },
  doubledBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
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
