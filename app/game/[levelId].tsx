import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import * as Haptics from 'expo-haptics';
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
import StreakGlow from '@/src/components/StreakGlow';
import { setWeeklyProgressMax } from '@/src/utils/weeklyChallenges';
import PowerUpFlash from '@/src/components/PowerUpFlash';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import type { Level } from '@/src/types/game';

const isWeb = Platform.OS === 'web';
const enterFade = isWeb ? undefined : FadeIn;
const exitFade = isWeb ? undefined : FadeOut;
const AnimatedOrView = isWeb ? View : Animated.View;

function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, score } = useGameStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedPowerUps, setUsedPowerUps] = useState<Record<PowerUpId, boolean>>({ slowTime: false, peek: false, fiftyFifty: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showPeekScene, setShowPeekScene] = useState(false);
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [timerBonus, setTimerBonus] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<'slowTime' | 'peek' | 'fiftyFifty' | 'skip' | null>(null);
  const loseLife = useGameStore((s) => s.loseLife);
  const usePowerUp = useGameStore((s) => s.usePowerUp);
  const powerUps = useGameStore((s) => s.powerUps) ?? { slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0 };

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

  // Reset local state when level changes (prevents power-up/state bleed)
  useEffect(() => {
    setUsedPowerUps({ slowTime: false, peek: false, fiftyFifty: false, skip: false });
    setHiddenOptions([]);
    setShowPeekScene(false);
    setBuyPopupId(null);
    setTimerBonus(0);
    setShowQuitConfirm(false);
    setCorrectStreak(0);
    setActivePowerUp(null);
  }, [levelId]);

  useEffect(() => { if (level) resetGame(); }, [level]);

  const currentScene = level?.scenes[currentSceneIndex];
  const currentQuestion = currentScene?.questions[currentQuestionIndex];
  const totalQuestions = currentScene?.questions.length ?? 0;

  const clearTimeouts = useCallback(() => {
    if (revealTimeout.current) { clearTimeout(revealTimeout.current); revealTimeout.current = null; }
    if (transitionTimeout.current) { clearTimeout(transitionTimeout.current); transitionTimeout.current = null; }
    if (peekTimeout.current) { clearTimeout(peekTimeout.current); peekTimeout.current = null; }
  }, []);
  useEffect(() => { return clearTimeouts; }, [clearTimeouts]);

  const handleStart = useCallback(() => { if (level) startLevel(level); }, [level, startLevel]);
  const handleMemoriseComplete = useCallback(() => { setGameState('TRANSITION'); clearTimeouts(); transitionTimeout.current = setTimeout(() => setGameState('QUESTION'), 1200); }, [setGameState, clearTimeouts]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null) return;
    selectOption(index);
    clearTimeouts();
    transitionTimeout.current = setTimeout(() => {
      revealAnswer();
      const isCorrect = currentQuestion && index === currentQuestion.correctIndex;
      setCorrectStreak(prev => {
        const next = isCorrect ? prev + 1 : 0;
        if (next > 0) setWeeklyProgressMax('correct_streak', next);
        return next;
      });
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
    setActivePowerUp('slowTime');
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [usedPowerUps.slowTime, powerUps.slowTime, usePowerUp]);

  const handleQuestionPowerUp = useCallback((id: PowerUpId) => {
    if (usedPowerUps[id]) return;
    if (powerUps[id] <= 0) { setBuyPopupId(id); return; }

    if (id === 'peek') {
      usePowerUp('peek');
      setUsedPowerUps(p => ({ ...p, peek: true }));
      setShowPeekScene(true);
      setActivePowerUp('peek');
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      peekTimeout.current = setTimeout(() => setShowPeekScene(false), 2000);
    } else if (id === 'fiftyFifty' && currentQuestion) {
      usePowerUp('fiftyFifty');
      setUsedPowerUps(p => ({ ...p, fiftyFifty: true }));
      setActivePowerUp('fiftyFifty');
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
        <Pressable onPress={() => {
          const inGame = gameState === 'MEMORISE' || gameState === 'TRANSITION' || gameState === 'QUESTION' || gameState === 'REVEAL' || gameState === 'SCENE_SCORE';
          if (inGame) setShowQuitConfirm(true);
          else { clearTimeouts(); resetGame(); router.back(); }
        }}>
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
        <AnimatedOrView entering={enterFade} style={styles.centered}>
          <AnimatedBlink expression="blank" size={80} entrance="spring" />
          <View style={[styles.blankContainer, { marginTop: 16 }]}>
            <Text style={styles.blankText}>Go blank!</Text>
            <Text style={styles.blankSubtext}>What do you remember?</Text>
          </View>
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

      {/* Premium animation overlays */}
      <StreakGlow streak={correctStreak} />
      <PowerUpFlash type={activePowerUp} onDone={() => setActivePowerUp(null)} />

      {/* Quit confirmation modal */}
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

export default GameScreen;

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
  blankContainer: { alignItems: 'center', gap: 8 },
  blankText: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, color: colors.accent },
  blankSubtext: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textLight },
  sceneScoreTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  sceneScoreBody: { fontSize: typography.sizes.lg, color: colors.textMid },
  errorText: { fontSize: typography.sizes.lg, color: colors.textMid, textAlign: 'center', marginBottom: spacing.lg },
  quitBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  quitBackdropTouch: { ...StyleSheet.absoluteFillObject },
  quitCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  quitTitle: { fontSize: 20, fontWeight: '700' as const },
  quitMessage: { fontSize: 14, textAlign: 'center' as const, marginBottom: 4 },
  quitLeaveBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center' as const, width: '100%' as any },
  quitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
});
