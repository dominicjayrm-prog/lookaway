import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { getStarsForScore } from '@/src/utils/scoring';
import { getNextLevelId } from '@/src/data/levels';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

function GemRewardAnimation({ amount, colors }: { amount: number; colors: Record<string, string> }) {
  const scale = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(20)).current;
  const gemIcon = String.fromCodePoint(0x1f48e);

  useEffect(() => {
    // Delay then spring in
    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 600);
    return () => clearTimeout(timer);
  }, [scale, opacity, translateY]);

  return (
    <RNAnimated.View style={[styles.gemReward, { opacity, transform: [{ scale }, { translateY }] }]}>
      <View style={[styles.gemRewardPill, { backgroundColor: colors.goldSoft }]}>
        <Text style={styles.gemRewardIcon}>{gemIcon}</Text>
        <Text style={[styles.gemRewardText, { color: colors.gold }]}>+{amount} gems</Text>
      </View>
    </RNAnimated.View>
  );
}

export default function ResultScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { score, answers, currentLevel, gameState, resetGame, recordLevelComplete, loseLife, addStars } = useGameStore();
  const level = currentLevel;
  const passed = gameState === 'COMPLETE';
  const stars = level ? getStarsForScore(score, level) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;
  const isPerfect = totalCount > 0 && correctCount === totalCount;
  const nextLevelId = useMemo(() => (level ? getNextLevelId(level.id) : null), [level]);

  const [gemsEarned, setGemsEarned] = useState(0);
  const [processed, setProcessed] = useState(false);

  // Process level result once
  useEffect(() => {
    if (processed || !level) return;
    setProcessed(true);

    if (passed) {
      const earned = recordLevelComplete(level.id, stars, score);
      setGemsEarned(earned);
      if (stars > 0) addStars(stars);
    } else {
      loseLife();
    }
  }, [passed, processed, level, stars, score, recordLevelComplete, loseLife, addStars]);

  const handleNextLevel = () => { resetGame(); if (nextLevelId) router.replace(`/game/${nextLevelId}`); };
  const handleBackToMap = () => { resetGame(); router.replace('/(tabs)'); };
  const handleRetry = () => { const id = level?.id; resetGame(); if (id) router.replace(`/game/${id}`); else router.replace('/(tabs)'); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        {passed ? (
          <>
            <Text style={[styles.completeTitle, { color: colors.correct }]}>Level complete!</Text>
            {isPerfect && (
              <View style={styles.perfectBadge}>
                <Text style={styles.perfectText}>PERFECT!</Text>
              </View>
            )}
            <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />
          </>
        ) : (
          <>
            <Text style={[styles.failedTitle, { color: colors.wrong }]}>Not quite...</Text>
            <Text style={[styles.lifeLostText, { color: colors.wrong }]}>{'\u{1F494}'} Life lost</Text>
          </>
        )}
        <Text style={[styles.scoreText, { color: colors.text }]}>{score}%</Text>
        <Text style={[styles.scoreLabel, { color: colors.textMid }]}>{correctCount}/{totalCount} correct</Text>

        {/* Gem reward animation */}
        {passed && gemsEarned > 0 && (
          <GemRewardAnimation amount={gemsEarned} colors={colors} />
        )}
        {passed && gemsEarned === 0 && (
          <Text style={[styles.noGemsText, { color: colors.textLight }]}>Already completed — improve your stars to earn more gems!</Text>
        )}

        {!passed && level && <Text style={[styles.requireText, { color: colors.textMid }]}>You need {level.requiredScore}% to pass</Text>}

        <View style={styles.buttons}>
          {passed ? (
            <>
              {nextLevelId ? (
                <Button title="Next level" onPress={handleNextLevel} />
              ) : (
                <Text style={[styles.worldCompleteText, { color: colors.accent }]}>World 1 Complete!</Text>
              )}
              <Button title="Replay" variant="secondary" onPress={handleRetry} />
              <Button title="Back to map" variant="ghost" onPress={handleBackToMap} />
            </>
          ) : (
            <>
              <Button title="Try again" onPress={handleRetry} />
              <Button title="Back to map" variant="ghost" onPress={handleBackToMap} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  completeTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  failedTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  lifeLostText: { fontSize: typography.sizes.md, marginTop: -8 },
  perfectBadge: { backgroundColor: 'rgba(212, 160, 18, 0.1)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 999 },
  perfectText: { fontSize: 16, fontWeight: '800', letterSpacing: 2, color: '#D4A012' },
  scoreText: { fontSize: 56, fontWeight: typography.weights.black },
  scoreLabel: { fontSize: typography.sizes.md },
  gemReward: { alignItems: 'center' },
  gemRewardPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  gemRewardIcon: { fontSize: 22 },
  gemRewardText: { fontSize: 18, fontWeight: '700' },
  noGemsText: { fontSize: typography.sizes.sm, textAlign: 'center', maxWidth: 240 },
  requireText: { fontSize: typography.sizes.md },
  worldCompleteText: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, textAlign: 'center', marginBottom: spacing.sm },
  buttons: { gap: spacing.md, marginTop: spacing.xl, width: '100%', maxWidth: 240 },
});
