import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { useGameStore } from '@/src/store';
import { getStarsForScore, GEM_REWARDS } from '@/src/utils/scoring';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function ResultScreen() {
  const router = useRouter();
  const { score, answers, currentLevel, gameState, resetGame } =
    useGameStore();

  const level = currentLevel;
  const passed = gameState === 'COMPLETE';

  const stars = level ? getStarsForScore(score, level) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;

  const handleContinue = () => {
    resetGame();
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    const id = level?.id;
    resetGame();
    if (id) {
      router.replace(`/game/${id}`);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {passed ? (
          <>
            <Text style={styles.completeTitle}>Level complete!</Text>
            <StarRating stars={stars as 0 | 1 | 2 | 3} size={44} animate={true} />
          </>
        ) : (
          <Text style={styles.failedTitle}>Not quite...</Text>
        )}

        <Text style={styles.scoreText}>{score}%</Text>
        <Text style={styles.scoreLabel}>
          {correctCount} / {totalCount} correct
        </Text>

        {passed && (
          <Card style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>Gems earned</Text>
            <Text style={styles.rewardValue}>
              +{GEM_REWARDS[stars as 0 | 1 | 2 | 3]}
            </Text>
          </Card>
        )}

        {!passed && level && (
          <Text style={styles.requireText}>
            You need {level.requiredScore}% to pass
          </Text>
        )}

        <View style={styles.buttons}>
          {passed ? (
            <Button title="Continue" onPress={handleContinue} />
          ) : (
            <>
              <Button title="Try again" onPress={handleRetry} />
              <Button
                title="Back to map"
                variant="ghost"
                onPress={handleContinue}
              />
            </>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  completeTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.correct,
  },
  failedTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.wrong,
  },
  scoreText: {
    fontSize: 56,
    fontWeight: typography.weights.black,
    color: colors.text,
  },
  scoreLabel: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  rewardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 240,
  },
  rewardLabel: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  rewardValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.gold,
  },
  requireText: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  buttons: {
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 240,
  },
});
