import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { useGameStore } from '@/src/store';
import { getStarsForScore } from '@/src/utils/scoring';
import { getNextLevelId } from '@/src/data/levels';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function ResultScreen() {
  const router = useRouter();
  const { score, answers, currentLevel, gameState, resetGame, recordLevelComplete, loseLife, addStars } = useGameStore();
  const level = currentLevel;
  const passed = gameState === 'COMPLETE';
  const stars = level ? getStarsForScore(score, level) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;
  const isPerfect = totalCount > 0 && correctCount === totalCount;
  const nextLevelId = useMemo(() => (level ? getNextLevelId(level.id) : null), [level]);
  const gemIcon = String.fromCodePoint(0x1f48e);

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
      // Failed — lose a life
      loseLife();
    }
  }, [passed, processed, level, stars, score, recordLevelComplete, loseLife, addStars]);

  const handleNextLevel = () => { resetGame(); if (nextLevelId) router.replace(`/game/${nextLevelId}`); };
  const handleBackToMap = () => { resetGame(); router.replace('/(tabs)'); };
  const handleRetry = () => { const id = level?.id; resetGame(); if (id) router.replace(`/game/${id}`); else router.replace('/(tabs)'); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {passed ? (
          <>
            <Text style={styles.completeTitle}>Level complete!</Text>
            {isPerfect && (
              <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.perfectBadge}>
                <Text style={styles.perfectText}>PERFECT!</Text>
              </Animated.View>
            )}
            <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate />
          </>
        ) : (
          <>
            <Text style={styles.failedTitle}>Not quite...</Text>
            <Text style={styles.lifeLostText}>{'\u{1F494}'} Life lost</Text>
          </>
        )}
        <Text style={styles.scoreText}>{score}%</Text>
        <Text style={styles.scoreLabel}>{correctCount}/{totalCount} correct</Text>
        {passed && gemsEarned > 0 && (
          <Card style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>Gems earned</Text>
            <Text style={styles.rewardValue}>+{gemsEarned} {gemIcon}</Text>
          </Card>
        )}
        {passed && gemsEarned === 0 && (
          <Text style={styles.noGemsText}>Already completed — improve your stars to earn more gems!</Text>
        )}
        {!passed && level && <Text style={styles.requireText}>You need {level.requiredScore}% to pass</Text>}
        <View style={styles.buttons}>
          {passed ? (
            <>
              {nextLevelId ? <Button title="Next level" onPress={handleNextLevel} /> : <Text style={styles.worldCompleteText}>World 1 Complete!</Text>}
              <Button title="Replay" variant="secondary" onPress={handleRetry} />
              {!nextLevelId && <Button title="Back to map" variant="ghost" onPress={handleBackToMap} />}
            </>
          ) : (
            <>
              <Button title="Try again" onPress={handleRetry} />
              <Button title="Back to map" variant="ghost" onPress={handleBackToMap} />
            </>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  completeTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.correct },
  failedTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.wrong },
  lifeLostText: { fontSize: typography.sizes.md, color: colors.wrong, marginTop: -8 },
  perfectBadge: { backgroundColor: 'rgba(212, 160, 18, 0.1)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 999 },
  perfectText: { fontSize: 16, fontWeight: '800', letterSpacing: 2, color: '#D4A012' },
  scoreText: { fontSize: 56, fontWeight: typography.weights.black, color: colors.text },
  scoreLabel: { fontSize: typography.sizes.md, color: colors.textMid },
  rewardCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 240 },
  rewardLabel: { fontSize: typography.sizes.md, color: colors.textMid },
  rewardValue: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.gold },
  noGemsText: { fontSize: typography.sizes.sm, color: colors.textLight, textAlign: 'center', maxWidth: 240 },
  requireText: { fontSize: typography.sizes.md, color: colors.textMid },
  worldCompleteText: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.accent, textAlign: 'center', marginBottom: spacing.sm },
  buttons: { gap: spacing.md, marginTop: spacing.xl, width: '100%', maxWidth: 240 },
});
