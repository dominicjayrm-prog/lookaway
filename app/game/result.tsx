import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StarRating } from '@/src/components/StarRating';
import { useGameStore } from '@/src/store';
import { getStarsForScore } from '@/src/utils/scoring';
import { useTheme } from '@/src/providers/ThemeProvider';
import { WORLD_LEVEL_COUNTS, WORLD_NAMES } from '@/src/data/worldPaths';
import { checkStreakMilestone } from '@/src/data/streakMilestones';
import { StreakCelebration } from '@/src/components/StreakCelebration';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

const GEM = String.fromCodePoint(0x1f48e);
const HEART = String.fromCodePoint(0x1f494);
const PARTY = String.fromCodePoint(0x1f389);

/** Parse level ID like "w1-l5" into { worldId, levelNum } */
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

export default function ResultScreen() {
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

  // Parse level info
  const parsed = level ? parseLevelId(level.id) : null;
  const worldId = parsed?.worldId ?? 1;
  const levelNum = parsed?.levelNum ?? 1;
  const worldTotalLevels = WORLD_LEVEL_COUNTS[worldId] ?? 20;
  const isLastLevelOfWorld = levelNum === worldTotalLevels;
  const nextWorldId = worldId < 6 ? worldId + 1 : null;
  const nextWorldName = nextWorldId ? WORLD_NAMES[nextWorldId] : null;
  const nextLevelId = !isLastLevelOfWorld ? `w${worldId}-l${levelNum + 1}` : null;

  // Process level result once
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
      incrementStreak(); // Track daily play streak
      // Check for streak milestone (after incrementStreak updates the count)
      setTimeout(() => {
        const newStreak = useGameStore.getState().streakCount;
        const claimed = useGameStore.getState().streakMilestonesClaimed;
        const milestone = checkStreakMilestone(newStreak, claimed);
        if (milestone) setCelebration(milestone);
      }, 100);
    } else {
      loseLife();
    }
  }, [passed, processed, level, stars, score, recordLevelComplete, loseLife, addStars, levelProgress]);

  // Navigation handlers
  const handleNextLevel = () => {
    resetGame();
    if (nextLevelId) router.replace(`/game/${nextLevelId}`);
  };
  const handleNextWorld = () => {
    resetGame();
    if (nextWorldId) router.replace(`/world/${nextWorldId}`);
  };
  const handleBackToMap = () => {
    resetGame();
    router.replace(`/world/${worldId}`);
  };
  const handleRetry = () => {
    const id = level?.id;
    resetGame();
    if (id) router.replace(`/game/${id}`);
    else router.replace(`/world/${worldId}`);
  };

  // Gem display text
  let gemText: string | null = null;
  if (passed && gemsEarned > 0) {
    if (!wasReplay) {
      gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''}`;
    } else if (improved) {
      gemText = `+${gemsEarned} gem${gemsEarned !== 1 ? 's' : ''} (star improvement!)`;
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        {/* ── PASS ── */}
        {passed ? (
          <>
            <Text style={[styles.completeTitle, { color: colors.correct }]}>Level complete!</Text>
            {isPerfect && (
              <View style={styles.perfectBadge}>
                <Text style={styles.perfectText}>PERFECT!</Text>
              </View>
            )}
            <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />

            <Text style={[styles.scoreText, { color: colors.text }]}>{score}%</Text>
            <Text style={[styles.scoreLabel, { color: colors.textMid }]}>{correctCount}/{totalCount} correct</Text>

            {/* Gem reward */}
            {gemText && <GemRewardAnimation text={gemText} colors={colors} />}
            {passed && gemsEarned === 0 && wasReplay && !improved && (
              <Text style={[styles.noGemsText, { color: colors.textLight }]}>Already completed — improve your stars to earn more gems!</Text>
            )}

            {/* World complete banner */}
            {isLastLevelOfWorld && (
              <View style={styles.worldCompleteBanner}>
                <Text style={styles.worldCompleteEmoji}>{PARTY}</Text>
                <Text style={[styles.worldCompleteTitle, { color: colors.accent }]}>
                  {WORLD_NAMES[worldId]} Complete!
                </Text>
                {nextWorldName && (
                  <Text style={[styles.worldCompleteSubtitle, { color: colors.textMid }]}>
                    {nextWorldName} unlocked!
                  </Text>
                )}
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttons}>
              {isLastLevelOfWorld ? (
                nextWorldId ? (
                  <Pressable style={styles.primaryButton} onPress={handleNextWorld}>
                    <Text style={styles.primaryButtonText}>Continue to {nextWorldName}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.primaryButton} onPress={handleBackToMap}>
                    <Text style={styles.primaryButtonText}>Back to map</Text>
                  </Pressable>
                )
              ) : (
                <Pressable style={styles.primaryButton} onPress={handleNextLevel}>
                  <Text style={styles.primaryButtonText}>Next Level</Text>
                </Pressable>
              )}
              <Pressable style={styles.secondaryLink} onPress={handleBackToMap}>
                <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to map</Text>
              </Pressable>
            </View>
          </>
        ) : (
          /* ── FAIL ── */
          <>
            <Text style={[styles.failedTitle, { color: colors.wrong }]}>Not quite...</Text>

            <Text style={[styles.scoreText, { color: colors.text }]}>{correctCount}/{totalCount} correct</Text>

            <View style={[styles.lifeLostPill, { backgroundColor: colors.wrongSoft }]}>
              <Text style={styles.lifeLostIcon}>{HEART}</Text>
              <Text style={[styles.lifeLostText, { color: colors.wrong }]}>-1 life</Text>
            </View>

            {level && (
              <Text style={[styles.requireText, { color: colors.textMid }]}>You need {level.requiredScore}% to pass</Text>
            )}

            <View style={styles.buttons}>
              <Pressable style={styles.primaryButton} onPress={handleRetry}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
              <Pressable style={styles.secondaryLink} onPress={handleBackToMap}>
                <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to map</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Streak celebration overlay */}
      {celebration && (
        <StreakCelebration
          visible
          days={celebration.days}
          gems={celebration.gems}
          title={celebration.title}
          color={celebration.color}
          onDismiss={() => {
            // Award gems and mark milestone as claimed
            addGems(celebration.gems);
            useGameStore.setState((s) => ({
              streakMilestonesClaimed: [...s.streakMilestonesClaimed, celebration.days],
            }));
            setCelebration(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },

  // Pass state
  completeTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  perfectBadge: { backgroundColor: 'rgba(212, 160, 18, 0.1)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 999 },
  perfectText: { fontSize: 16, fontWeight: '800', letterSpacing: 2, color: '#D4A012' },

  // Fail state
  failedTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  lifeLostPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  lifeLostIcon: { fontSize: 18 },
  lifeLostText: { fontSize: 15, fontWeight: '700' },

  // Shared
  scoreText: { fontSize: 48, fontWeight: typography.weights.black, marginTop: 4 },
  scoreLabel: { fontSize: typography.sizes.md, marginTop: -4 },
  requireText: { fontSize: typography.sizes.md },

  // Gem reward
  gemReward: { alignItems: 'center' },
  gemRewardPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  gemRewardIcon: { fontSize: 20 },
  gemRewardText: { fontSize: 16, fontWeight: '700' },
  noGemsText: { fontSize: typography.sizes.sm, textAlign: 'center', maxWidth: 240 },

  // World complete
  worldCompleteBanner: { alignItems: 'center', marginTop: 4 },
  worldCompleteEmoji: { fontSize: 28 },
  worldCompleteTitle: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  worldCompleteSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Buttons
  buttons: { width: '100%', maxWidth: 280, marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  primaryButton: {
    width: '100%',
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryLink: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryLinkText: { fontSize: 14, fontWeight: '600' },
});
