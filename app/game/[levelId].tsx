import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { useGameStore } from '@/src/store';
import { getLevelById } from '@/src/data/levels';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const {
    gameState,
    currentSceneIndex,
    currentQuestionIndex,
    selectedOption,
    revealedCorrect,
    score,
    answers,
    startLevel,
    setGameState,
    selectOption,
    revealAnswer,
    nextQuestion,
    nextScene,
    resetGame,
    addGems,
    addStars,
    loseLife,
  } = useGameStore();

  const level = getLevelById(levelId ?? '');

  useEffect(() => {
    if (level) {
      resetGame();
    }
  }, [level]);

  const currentScene = level?.scenes[currentSceneIndex];
  const currentQuestion = currentScene?.questions[currentQuestionIndex];
  const totalQuestions = currentScene?.questions.length ?? 0;

  const handleStart = useCallback(() => {
    if (level) startLevel(level);
  }, [level, startLevel]);

  const handleMemoriseComplete = useCallback(() => {
    setGameState('TRANSITION');
    setTimeout(() => setGameState('QUESTION'), 800);
  }, [setGameState]);

  const handleSelectOption = useCallback(
    (index: number) => {
      if (selectedOption !== null) return;
      selectOption(index);

      setTimeout(() => {
        revealAnswer();

        const isCorrect =
          currentQuestion && index === currentQuestion.correctIndex;

        if (isCorrect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        revealTimeout.current = setTimeout(() => {
          nextQuestion();
        }, 800);
      }, 300);
    },
    [selectedOption, selectOption, revealAnswer, nextQuestion, currentQuestion],
  );

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption === null) {
      selectOption(-1);
      revealAnswer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      revealTimeout.current = setTimeout(() => {
        nextQuestion();
      }, 800);
    }
  }, [selectedOption, selectOption, revealAnswer, nextQuestion]);

  const handleNextScene = useCallback(() => {
    nextScene();
  }, [nextScene]);

  const getStars = (): 0 | 1 | 2 | 3 => {
    if (!level) return 0;
    if (score >= level.parScore) return 3;
    if (score >= 80) return 2;
    if (score >= level.requiredScore) return 1;
    return 0;
  };

  const handleComplete = useCallback(() => {
    const stars = getStars();
    const gemReward = stars === 3 ? 20 : stars === 2 ? 10 : 5;
    addGems(gemReward);
    addStars(stars);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [score, level, addGems, addStars]);

  const handleFailed = useCallback(() => {
    loseLife();
  }, [loseLife]);

  useEffect(() => {
    if (gameState === 'COMPLETE') handleComplete();
    if (gameState === 'FAILED') handleFailed();
  }, [gameState]);

  useEffect(() => {
    return () => {
      if (revealTimeout.current) clearTimeout(revealTimeout.current);
    };
  }, []);

  if (!level) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Level not found</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { resetGame(); router.back(); }}>
          <Text style={styles.closeButton}>\u2715</Text>
        </Pressable>
        <Badge label={`LEVEL ${level.levelNumber}`} />
        <View style={styles.headerSpacer} />
      </View>

      {/* READY state */}
      {gameState === 'READY' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.levelSubtitle}>
            {level.scenes.length} scene{level.scenes.length > 1 ? 's' : ''}
          </Text>
          <Button
            title="Start"
            onPress={handleStart}
            style={styles.startButton}
          />
        </Animated.View>
      )}

      {/* MEMORISE state */}
      {gameState === 'MEMORISE' && currentScene && (
        <Animated.View entering={FadeIn} style={styles.gameArea}>
          <CountdownTimer
            duration={currentScene.viewTime}
            running={true}
            onComplete={handleMemoriseComplete}
            style={styles.timer}
          />
          <Text style={styles.memoriseText}>Memorise this scene!</Text>
          <SceneRenderer objects={currentScene.objects} visible={true} />
        </Animated.View>
      )}

      {/* TRANSITION state */}
      {gameState === 'TRANSITION' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centered}>
          <Text style={styles.lookAwayText}>Look away!</Text>
        </Animated.View>
      )}

      {/* QUESTION state */}
      {gameState === 'QUESTION' && currentQuestion && (
        <Animated.View entering={FadeIn} style={styles.gameArea}>
          <CountdownTimer
            duration={currentQuestion.timeLimit}
            running={true}
            onComplete={handleQuestionTimeout}
            style={styles.timer}
          />
          <QuestionCard
            questionText={currentQuestion.text}
            options={[...currentQuestion.options]}
            selectedIndex={selectedOption}
            revealedCorrectIndex={null}
            onSelect={handleSelectOption}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
          />
        </Animated.View>
      )}

      {/* REVEAL state */}
      {gameState === 'REVEAL' && currentQuestion && (
        <View style={styles.gameArea}>
          <QuestionCard
            questionText={currentQuestion.text}
            options={[...currentQuestion.options]}
            selectedIndex={selectedOption}
            revealedCorrectIndex={revealedCorrect}
            onSelect={() => {}}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
          />
        </View>
      )}

      {/* SCENE_SCORE state */}
      {gameState === 'SCENE_SCORE' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.sceneScoreTitle}>Scene complete!</Text>
          <Text style={styles.sceneScoreBody}>
            {answers.filter((a) => a.isCorrect).length} / {answers.length} correct
          </Text>
          <Button
            title="Next scene"
            onPress={handleNextScene}
            style={styles.startButton}
          />
        </Animated.View>
      )}

      {/* COMPLETE state */}
      {gameState === 'COMPLETE' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.completeTitle}>Level complete!</Text>
          <StarRating stars={getStars()} size={40} animate={true} />
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.scoreLabel}>
            {answers.filter((a) => a.isCorrect).length} / {answers.length}{' '}
            correct
          </Text>
          <View style={styles.completeButtons}>
            <Button
              title="Continue"
              onPress={() => { resetGame(); router.back(); }}
            />
          </View>
        </Animated.View>
      )}

      {/* FAILED state */}
      {gameState === 'FAILED' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.failedTitle}>Not quite...</Text>
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.scoreLabel}>
            You need {level.requiredScore}% to pass
          </Text>
          <View style={styles.completeButtons}>
            <Button title="Try again" onPress={handleStart} />
            <Button
              title="Back to map"
              variant="ghost"
              onPress={() => { resetGame(); router.back(); }}
            />
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeButton: {
    fontSize: typography.sizes.xl,
    color: colors.textMid,
    padding: spacing.sm,
  },
  headerSpacer: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  gameArea: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  timer: {
    marginBottom: spacing.sm,
  },
  levelTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  levelSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  startButton: {
    minWidth: 160,
    marginTop: spacing.lg,
  },
  memoriseText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.textMid,
    textAlign: 'center',
  },
  lookAwayText: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    color: colors.accent,
  },
  sceneScoreTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sceneScoreBody: {
    fontSize: typography.sizes.lg,
    color: colors.textMid,
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
  completeButtons: {
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 240,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
