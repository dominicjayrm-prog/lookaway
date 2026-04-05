import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { useGameStore } from '@/src/store';
import { getStarsForScore, GEM_REWARDS } from '@/src/utils/scoring';
import { generateDailyChallenge, getTodayDateString } from '@/src/utils/dailyChallenge';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import type { Level } from '@/src/types/game';

const isWeb = Platform.OS === 'web';

export default function DailyGameScreen() {
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateStr = getTodayDateString();
  const dailyLevel: Level = useMemo(() => {
    const scenes = generateDailyChallenge(dateStr);
    return { id: `daily-${dateStr}`, worldId: 0, levelNumber: 0, title: 'Daily Challenge', scenes, requiredScore: 60, parScore: 100 };
  }, [dateStr]);

  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, addGems, addStars, incrementStreak, score } = useGameStore();
  const loseLife = useGameStore((s) => s.loseLife);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  useEffect(() => { resetGame(); }, []);

  const currentScene = dailyLevel.scenes[currentSceneIndex];
  const currentQuestion = currentScene?.questions[currentQuestionIndex];
  const totalQuestions = currentScene?.questions.length ?? 0;

  const clearTimeouts = useCallback(() => {
    if (revealTimeout.current) { clearTimeout(revealTimeout.current); revealTimeout.current = null; }
    if (transitionTimeout.current) { clearTimeout(transitionTimeout.current); transitionTimeout.current = null; }
  }, []);
  useEffect(() => { return clearTimeouts; }, [clearTimeouts]);

  const handleStart = useCallback(() => { startLevel(dailyLevel); }, [dailyLevel, startLevel]);
  const handleMemoriseComplete = useCallback(() => { setGameState('TRANSITION'); clearTimeouts(); transitionTimeout.current = setTimeout(() => setGameState('QUESTION'), 800); }, [setGameState, clearTimeouts]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null) return;
    selectOption(index);
    clearTimeouts();
    transitionTimeout.current = setTimeout(() => {
      revealAnswer();
      const isCorrect = currentQuestion && index === currentQuestion.correctIndex;
      if (!isWeb) {
        if (isCorrect) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      revealTimeout.current = setTimeout(() => { nextQuestion(); }, 800);
    }, 300);
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, currentQuestion, clearTimeouts]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption === null) { selectOption(null); revealAnswer(); if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); clearTimeouts(); revealTimeout.current = setTimeout(() => { nextQuestion(); }, 800); }
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, clearTimeouts]);

  const handleNextScene = useCallback(() => { nextScene(); }, [nextScene]);

  useEffect(() => {
    if (gameState === 'COMPLETE') { const stars = getStarsForScore(score, dailyLevel); addGems(GEM_REWARDS[stars]); addStars(stars); incrementStreak(); if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.replace('/game/result'); }
    if (gameState === 'FAILED') { router.replace('/game/result'); }
  }, [gameState]);

  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => {
          const activePhases = ['MEMORISE', 'TRANSITION', 'QUESTION', 'REVEAL', 'SCENE_SCORE'];
          if (activePhases.includes(gameState)) { setShowQuitConfirm(true); }
          else { clearTimeouts(); resetGame(); router.back(); }
        }}>
          <Text style={styles.closeButton}>{String.fromCharCode(10005)}</Text>
        </Pressable>
        <Badge label="DAILY CHALLENGE" />
        <View style={styles.headerSpacer} />
      </View>

      {gameState === 'READY' && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.centered}>
          <Text style={styles.levelTitle}>Daily Challenge</Text>
          <Text style={styles.levelSubtitle}>{formattedDate}</Text>
          <Text style={styles.sceneInfo}>5 scenes {String.fromCharCode(183)} 25 questions</Text>
          <Button title="Start" onPress={handleStart} style={styles.startButton} />
        </Animated.View>
      )}

      {gameState === 'MEMORISE' && !currentScene && (
        <View style={styles.centered}>
          <Text style={styles.levelSubtitle}>Loading...</Text>
        </View>
      )}

      {gameState === 'MEMORISE' && currentScene && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime} running={true} onComplete={handleMemoriseComplete} style={styles.timer} />
          <Text style={styles.memoriseText}>Memorise this scene!</Text>
          <SceneRenderer objects={currentScene.objects} visible={true} />
        </Animated.View>
      )}

      {gameState === 'TRANSITION' && (
        <Animated.View entering={isWeb ? undefined : FadeIn} exiting={isWeb ? undefined : FadeOut} style={styles.centered}>
          <Text style={styles.blankText}>Go blank!</Text>
        </Animated.View>
      )}

      {gameState === 'QUESTION' && currentQuestion && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.gameArea}>
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
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.centered}>
          <Text style={styles.sceneScoreTitle}>Scene complete!</Text>
          <Text style={styles.sceneScoreBody}>{answers.filter((a) => a.isCorrect).length} / {answers.length} correct</Text>
          <Button title="Next scene" onPress={handleNextScene} style={styles.startButton} />
        </Animated.View>
      )}

      {showQuitConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowQuitConfirm(false)}>
          <View style={styles.quitBackdrop}>
            <Pressable style={styles.quitBackdropTouch} onPress={() => setShowQuitConfirm(false)} />
            <View style={[styles.quitCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.quitTitle, { color: colors.text }]}>Leave level?</Text>
              <Text style={[styles.quitMessage, { color: colors.textMid }]}>You'll lose a life if you quit now.</Text>
              <Pressable style={[styles.quitLeaveBtn, { backgroundColor: colors.wrong }]} onPress={() => { setShowQuitConfirm(false); clearTimeouts(); loseLife(); resetGame(); router.back(); }}>
                <Text style={styles.quitBtnText}>Leave (-1 life)</Text>
              </Pressable>
              <Pressable style={[styles.quitLeaveBtn, { backgroundColor: colors.accent }]} onPress={() => setShowQuitConfirm(false)}>
                <Text style={styles.quitBtnText}>Keep playing</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  sceneInfo: { fontSize: typography.sizes.sm, color: colors.textLight },
  startButton: { minWidth: 160, marginTop: spacing.lg },
  memoriseText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.medium, color: colors.textMid, textAlign: 'center' },
  blankText: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, color: colors.accent },
  sceneScoreTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  sceneScoreBody: { fontSize: typography.sizes.lg, color: colors.textMid },
  quitBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  quitBackdropTouch: { ...StyleSheet.absoluteFillObject },
  quitCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  quitTitle: { fontSize: 20, fontWeight: '700' },
  quitMessage: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  quitLeaveBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', width: '100%' },
  quitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
