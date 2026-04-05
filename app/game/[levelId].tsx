import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';
const enterFade = isWeb ? undefined : FadeIn;
const exitFade = isWeb ? undefined : FadeOut;
const AnimatedOrView = isWeb ? View : Animated.View;
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { PowerUpBar } from '@/src/components/PowerUpBar';
import { SlowTimeButton } from '@/src/components/SlowTimeButton';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import { useGameStore } from '@/src/store';
import { fetchLevelById } from '@/src/data/levels';
import { getStarsForScore } from '@/src/utils/scoring';
import type { PowerUpId } from '@/src/utils/scoring';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import type { Level } from '@/src/types/game';

export default function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, score } = useGameStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedPowerUps, setUsedPowerUps] = useState<Record<PowerUpId, boolean>>({ slowTime: false, peek: false, fiftyFifty: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showPeekScene, setShowPeekScene] = useState(false);
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [timerBonus, setTimerBonus] = useState(0);
  const usePowerUp = useGameStore((s) => s.usePowerUp);
  const powerUps = useGameStore((s) => s.powerUps);

  // Fetch level from Supabase (async), fall back to hardcoded
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLevelById(levelId ?? '').then((result) => {
      if (!cancelled) {
        setLevel(result ?? null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [levelId]);

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

  const handleNextScene = useCallback(() => { setHiddenOptions([]); nextScene(); }, [nextScene]);

  // Power-up handlers
  const handleSlowTime = useCallback(() => {
    if (usedPowerUps.slowTime) return;
    if (powerUps.slowTime <= 0) { setBuyPopupId('slowTime'); return; }
    usePowerUp('slowTime');
    setUsedPowerUps(p => ({ ...p, slowTime: true }));
    setTimerBonus(3);
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [usedPowerUps.slowTime, powerUps.slowTime, usePowerUp]);

  const handleQuestionPowerUp = useCallback((id: PowerUpId) => {
    if (usedPowerUps[id]) return;
    if (powerUps[id] <= 0) { setBuyPopupId(id); return; }

    if (id === 'peek') {
      usePowerUp('peek');
      setUsedPowerUps(p => ({ ...p, peek: true }));
      setShowPeekScene(true);
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setShowPeekScene(false), 1500);
    } else if (id === 'fiftyFifty' && currentQuestion) {
      usePowerUp('fiftyFifty');
      setUsedPowerUps(p => ({ ...p, fiftyFifty: true }));
      const wrong = currentQuestion.options.map((_, i) => i).filter(i => i !== currentQuestion.correctIndex);
      const shuffled = [...wrong].sort(() => Math.random() - 0.5);
      setHiddenOptions(shuffled.slice(0, 2));
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (id === 'skip' && currentQuestion) {
      usePowerUp('skip');
      setUsedPowerUps(p => ({ ...p, skip: true }));
      handleSelectOption(currentQuestion.correctIndex);
    }
  }, [usedPowerUps, powerUps, usePowerUp, currentQuestion, handleSelectOption]);

  const handleBuyPopupPurchased = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    // Auto-use after buying
    if (id === 'slowTime') handleSlowTime();
    else handleQuestionPowerUp(id);
  }, [handleSlowTime, handleQuestionPowerUp]);

  useEffect(() => {
    if (gameState === 'COMPLETE' || gameState === 'FAILED') {
      if (!isWeb) Haptics.notificationAsync(gameState === 'COMPLETE' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      router.replace('/game/result');
    }
  }, [gameState]);

  if (loading) {
    return (<SafeAreaView style={styles.container}><ActivityIndicator size="large" color={colors.accent} /></SafeAreaView>);
  }

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
        <AnimatedOrView entering={enterFade} style={styles.centered}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.levelSubtitle}>{level.scenes.length} scene{level.scenes.length > 1 ? 's' : ''}</Text>
          <Button title="Start" onPress={handleStart} style={styles.startButton} />
        </AnimatedOrView>
      )}

      {gameState === 'MEMORISE' && currentScene && (
        <AnimatedOrView entering={enterFade} style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime + timerBonus} running={!buyPopupId} onComplete={handleMemoriseComplete} style={styles.timer} />
          <Text style={styles.memoriseText}>Memorise this scene!</Text>
          <SceneRenderer objects={currentScene.objects} visible={true} viewTime={currentScene.viewTime} />
          <SlowTimeButton used={usedPowerUps.slowTime} onUse={handleSlowTime} />
        </AnimatedOrView>
      )}

      {gameState === 'TRANSITION' && (
        <AnimatedOrView entering={enterFade} exiting={exitFade} style={styles.centered}>
          <Text style={styles.blankText}>Go blank!</Text>
        </AnimatedOrView>
      )}

      {gameState === 'QUESTION' && currentQuestion && (
        <AnimatedOrView entering={enterFade} style={styles.gameArea}>
          <CountdownTimer duration={currentQuestion.timeLimit} running={!showPeekScene && !buyPopupId} onComplete={handleQuestionTimeout} style={styles.timer} />
          {showPeekScene && currentScene ? (
            <SceneRenderer objects={currentScene.objects} visible={true} viewTime={currentScene.viewTime} />
          ) : (
            <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={null} onSelect={handleSelectOption} questionNumber={currentQuestionIndex + 1} totalQuestions={totalQuestions} hiddenOptions={hiddenOptions} />
          )}
          <PowerUpBar usedThisLevel={usedPowerUps} onUsePowerUp={handleQuestionPowerUp} />
        </AnimatedOrView>
      )}

      {gameState === 'REVEAL' && currentQuestion && (
        <View style={styles.gameArea}>
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={revealedCorrect} onSelect={() => {}} questionNumber={currentQuestionIndex + 1} totalQuestions={totalQuestions} />
        </View>
      )}

      {gameState === 'SCENE_SCORE' && (
        <AnimatedOrView entering={enterFade} style={styles.centered}>
          <Text style={styles.sceneScoreTitle}>Scene complete!</Text>
          <Text style={styles.sceneScoreBody}>{answers.filter((a) => a.isCorrect).length} / {answers.length} correct</Text>
          <Button title="Next scene" onPress={handleNextScene} style={styles.startButton} />
        </AnimatedOrView>
      )}

      {/* Buy power-up popup (pauses game timers) */}
      <BuyPowerUpPopup powerUpId={buyPopupId} onClose={() => setBuyPopupId(null)} onBought={handleBuyPopupPurchased} />
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
  blankText: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, color: colors.accent },
  sceneScoreTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  sceneScoreBody: { fontSize: typography.sizes.lg, color: colors.textMid },
  errorText: { fontSize: typography.sizes.lg, color: colors.textMid, textAlign: 'center', marginBottom: spacing.lg },
});
