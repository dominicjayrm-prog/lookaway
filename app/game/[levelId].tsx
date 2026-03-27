import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { useGameStore } from '@/src/store';
import { getLevelById } from '@/src/data/levels';
import { getStarsForScore, GEM_REWARDS } from '@/src/utils/scoring';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, addGems, addStars, loseLife, recordLevelComplete, score } = useGameStore();
  const level = getLevelById(levelId ?? '');

  useEffect(() => { if (level) resetGame(); }, [level]);

  const currentScene = level?.scenes[currentSceneIndex];
  const currentQuestion = currentScene?.questions[currentQuestionIndex];
  const totalQuestions = currentScene?.questions.length ?? 0;

  const clearTimeouts = useCallback(() => {
    if (revealTimeout.current) { clearTimeout(revealTimeout.current); revealTimeout.current = null; }
    if (transitionTimeout.current) { clearTimeout(transitionTimeout.current); transitionTimeout.current = null; }
  }, []);
  useEffect(() => { return clearTimeouts; }, [clearTimeouts]);

  const handleStart = useCallback(() => { if (level) startLevel(level); }, [level, startLevel]);
  const handleMemoriseComplete = useCallback(() => { setGameState('TRANSITION'); clearTimeouts(); transitionTimeout.current = setTimeout(() => setGameState('QUESTION'), 800); }, [setGameState, clearTimeouts]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null) return;
    selectOption(index);
    clearTimeouts();
    transitionTimeout.current = setTimeout(() => {
      revealAnswer();
      const isCorrect = currentQuestion && index === currentQuestion.correctIndex;
      if (isCorrect) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      revealTimeout.current = setTimeout(() => { nextQuestion(); }, 800);
    }, 300);
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, currentQuestion, clearTimeouts]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption === null) { selectOption(null); revealAnswer(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); clearTimeouts(); revealTimeout.current = setTimeout(() => { nextQuestion(); }, 800); }
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, clearTimeouts]);

  const handleNextScene = useCallback(() => { nextScene(); }, [nextScene]);

  useEffect(() => {
    if (gameState === 'COMPLETE' && level) {
      const stars = getStarsForScore(score, level);
      addGems(GEM_REWARDS[stars]);
      addStars(stars);
      recordLevelComplete(level.id, stars, score);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/game/result');
    }
    if (gameState === 'FAILED') { loseLife(); router.replace('/game/result'); }
  }, [gameState]);

  if (!level) {
    return (<SafeAreaView style={styles.container}><Text style={styles.errorText}>Level not found</Text><Button title="Go back" onPress={() => router.back()} /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { clearTimeouts(); resetGame(); router.back(); }}>
          <Text style={styles.closeButton}>{String.fromCharCode(10005)}</Text>
        </Pressable>
        <Badge label={`LEVEL ${level.levelNumber}`} />
        <View style={styles.headerSpacer} />
      </View>

      {gameState === 'READY' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.levelSubtitle}>{level.scenes.length} scene{level.scenes.length > 1 ? 's' : ''}</Text>
          <Button title="Start" onPress={handleStart} style={styles.startButton} />
        </Animated.View>
      )}

      {gameState === 'MEMORISE' && currentScene && (
        <Animated.View entering={FadeIn} style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime} running={true} onComplete={handleMemoriseComplete} style={styles.timer} />
          <Text style={styles.memoriseText}>Memorise this scene!</Text>
          <SceneRenderer objects={currentScene.objects} visible={true} />
        </Animated.View>
      )}

      {gameState === 'TRANSITION' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centered}>
          <Text style={styles.lookAwayText}>Look away!</Text>
        </Animated.View>
      )}

      {gameState === 'QUESTION' && currentQuestion && (
        <Animated.View entering={FadeIn} style={styles.gameArea}>
          <CountdownTimer duration={currentQuestion.timeLimit} running={true} onComplete={handleQuestionTimeout} style={styles.timer} />
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={null} onSelect={handleSelectOption} questionNumber={currentQuestionIndex + 1} totalQuestions={totalQuestions} />
        </Animated.View>
      )}

      {gameState === 'REVEAL' && currentQuestion && (
        <View style={styles.gameArea}>
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={revealedCorrect} onSelect={() => {}} questionNumber={currentQuestionIndex + 1} totalQuestions={totalQuestions} />
        </View>
      )}

      {gameState === 'SCENE_SCORE' && (
        <Animated.View entering={FadeIn} style={styles.centered}>
          <Text style={styles.sceneScoreTitle}>Scene complete!</Text>
          <Text style={styles.sceneScoreBody}>{answers.filter((a) => a.isCorrect).length} / {answers.length} correct</Text>
          <Button title="Next scene" onPress={handleNextScene} style={styles.startButton} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  closeButton: { fontSize: typography.sizes.xl, color: colors.textMid, padding: spacing.sm },
  headerSpacer: { width: 36 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  gameArea: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  timer: { marginBottom: spacing.sm },
  levelTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  levelSubtitle: { fontSize: typography.sizes.md, color: colors.textMid },
  startButton: { minWidth: 160, marginTop: spacing.lg },
  memoriseText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.medium, color: colors.textMid, textAlign: 'center' },
  lookAwayText: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, color: colors.accent },
  sceneScoreTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  sceneScoreBody: { fontSize: typography.sizes.lg, color: colors.textMid },
  errorText: { fontSize: typography.sizes.lg, color: colors.textMid, textAlign: 'center', marginBottom: spacing.lg },
});
