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
import { t } from '@/src/i18n';
import { useGameStore } from '@/src/store';
import { track, EVENTS } from '@/src/lib/analytics';
import { fetchLevelById } from '@/src/data/levels';
import { mastermindToStandardLevel, getMastermindLevel, type MastermindLevel } from '@/src/data/mastermindLevels';
import { getPositionForLevelId } from '@/src/data/unifiedJourney';
import { MastermindStageIndicator } from '@/src/components/MastermindStageIndicator';
import { getStarsForScore } from '@/src/utils/scoring';
import type { PowerUpId } from '@/src/utils/scoring';
import StreakGlow from '@/src/components/StreakGlow';
// Weekly-challenge tracking moved into gameStore.revealAnswer so we no
// longer import from weeklyChallenges here.
import PowerUpFlash from '@/src/components/PowerUpFlash';
import { colors } from '@/src/theme/colors';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { sounds } from '@/src/lib/sounds';
import { spacing } from '@/src/theme/spacing';
import type { Level } from '@/src/types/game';

const isWeb = Platform.OS === 'web';
const enterFade = isWeb ? undefined : FadeIn;
const exitFade = isWeb ? undefined : FadeOut;
const AnimatedOrView = isWeb ? View : Animated.View;

function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  // Theme-aware overrides for the static StyleSheet below. The static styles
  // reference the default (light) palette; these inline styles override the
  // background + key text colours so the screen looks right in dark mode.
  const { colors: tc } = useTheme();
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, score } = useGameStore();
  const isSubscribed = useGameStore((s) => s.isSubscribed());

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

  // ── Mastermind multi-stage state (W6 only) ──
  const isW6 = levelId?.startsWith('w6-l') ?? false;
  const w6Num = isW6 ? parseInt((levelId ?? '').replace('w6-l', ''), 10) : 0;
  const [mmLevel, setMmLevel] = useState<MastermindLevel | null>(null);
  const [mmStageIdx, setMmStageIdx] = useState(0);
  const mmStageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load raw Mastermind data for stage cycling
  useEffect(() => {
    if (isW6 && w6Num > 0) {
      setMmLevel(getMastermindLevel(w6Num));
      setMmStageIdx(0);
    } else {
      setMmLevel(null);
    }
  }, [isW6, w6Num]);

  // Cycle through stages during MEMORISE for W6
  useEffect(() => {
    if (!isW6 || !mmLevel || gameState !== 'MEMORISE') return;
    setMmStageIdx(0);
    let idx = 0;
    const perStage = mmLevel.secondsPerStage * 1000;
    const transition = 500;

    const advanceStage = () => {
      idx += 1;
      if (idx < mmLevel.stageCount) {
        setMmStageIdx(idx);
        mmStageTimer.current = setTimeout(advanceStage, perStage + transition);
      }
      // Final stage ends → handleMemoriseComplete fires via the CountdownTimer
    };

    mmStageTimer.current = setTimeout(advanceStage, perStage + transition);
    return () => { if (mmStageTimer.current) clearTimeout(mmStageTimer.current); };
  }, [isW6, mmLevel, gameState]);

  const loseLife = useGameStore((s) => s.loseLife);
  const usePowerUp = useGameStore((s) => s.usePowerUp);

  // Fetch level data. W6 levels use hardcoded Mastermind data;
  // everything else fetches from Supabase.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (levelId?.startsWith('w6-l')) {
      const num = parseInt(levelId.replace('w6-l', ''), 10);
      const converted = mastermindToStandardLevel(num);
      if (!cancelled) {
        setLevel(converted);
        setLoading(false);
      }
      return;
    }

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

  const handleStart = useCallback(() => {
    if (!level) return;
    track(EVENTS.LEVEL_STARTED, { levelId: level.id, worldId: level.worldId, levelNumber: level.levelNumber });
    startLevel(level);
  }, [level, startLevel]);
  const handleMemoriseComplete = useCallback(() => { sounds.play('whoosh'); setGameState('TRANSITION'); clearTimeouts(); transitionTimeout.current = setTimeout(() => setGameState('QUESTION'), 1200); }, [setGameState, clearTimeouts]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null) return;
    selectOption(index);
    clearTimeouts();
    transitionTimeout.current = setTimeout(() => {
      revealAnswer();
      const isCorrect = currentQuestion && index === currentQuestion.correctIndex;
      // Local streak state powers the in-level StreakGlow visual only.
      // Weekly challenge tracking of the best correct streak is
      // handled inside gameStore.revealAnswer via
      // recordQuestionAnsweredForChallenges, which also tracks fast
      // correct streaks for the speed_accuracy_10 skill challenge.
      setCorrectStreak(prev => (isCorrect ? prev + 1 : 0));
      sounds.play(isCorrect ? 'correct' : 'wrong');
      if (!isWeb) {
        if (isCorrect) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // 1200ms reveal (was 800): long enough for the 35-65 demo to
      // actually SEE which answer was right and learn from it before
      // the auto-advance — the old window read as a subliminal flash.
      revealTimeout.current = setTimeout(() => { setHiddenOptions([]); nextQuestion(); }, 1200);
    }, 300);
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, currentQuestion, clearTimeouts]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption === null) { selectOption(null); revealAnswer(); if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); clearTimeouts(); revealTimeout.current = setTimeout(() => { setHiddenOptions([]); nextQuestion(); }, 1200); }
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, clearTimeouts]);

  const handleNextScene = useCallback(() => { setHiddenOptions([]); nextScene(); }, [nextScene]);

  // Power-up handlers
  const handleSlowTime = useCallback(() => {
    if (usedPowerUps.slowTime) return;
    // Read live store value — `powerUps` from the selector lags by one
    // render after a buy, so the auto-use right after BuyPowerUpPopup
    // would otherwise see the pre-purchase 0 and re-open the popup.
    if (useGameStore.getState().getPowerUpCount('slowTime') <= 0) { setBuyPopupId('slowTime'); return; }
    usePowerUp('slowTime');
    setUsedPowerUps(p => ({ ...p, slowTime: true }));
    setTimerBonus(3);
    setActivePowerUp('slowTime');
    sounds.play('powerUp');
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [usedPowerUps.slowTime, usePowerUp]);

  const handleQuestionPowerUp = useCallback((id: PowerUpId) => {
    if (usedPowerUps[id]) return;
    if (useGameStore.getState().getPowerUpCount(id) <= 0) { setBuyPopupId(id); return; }

    if (id === 'peek') {
      usePowerUp('peek');
      setUsedPowerUps(p => ({ ...p, peek: true }));
      setShowPeekScene(true);
      setActivePowerUp('peek');
      sounds.play('powerUp');
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      peekTimeout.current = setTimeout(() => setShowPeekScene(false), 2000);
    } else if (id === 'fiftyFifty' && currentQuestion) {
      usePowerUp('fiftyFifty');
      setUsedPowerUps(p => ({ ...p, fiftyFifty: true }));
      setActivePowerUp('fiftyFifty');
      const wrong = currentQuestion.options.map((_, i) => i).filter(i => i !== currentQuestion.correctIndex);
      const shuffled = [...wrong].sort(() => Math.random() - 0.5);
      setHiddenOptions(shuffled.slice(0, 2));
      sounds.play('powerUp');
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (id === 'skip' && currentQuestion) {
      usePowerUp('skip');
      setUsedPowerUps(p => ({ ...p, skip: true }));
      handleSelectOption(currentQuestion.correctIndex);
    }
  }, [usedPowerUps, usePowerUp, currentQuestion, handleSelectOption]);

  const handleBuyPopupPurchased = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    // Auto-use after buying
    if (id === 'slowTime') handleSlowTime();
    else handleQuestionPowerUp(id);
  }, [handleSlowTime, handleQuestionPowerUp]);

  useEffect(() => {
    if (gameState === 'COMPLETE' || gameState === 'FAILED') {
      if (!isWeb) Haptics.notificationAsync(gameState === 'COMPLETE' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (level) {
        const base = { levelId: level.id, worldId: level.worldId, levelNumber: level.levelNumber };
        track(gameState === 'COMPLETE' ? EVENTS.LEVEL_COMPLETED : EVENTS.LEVEL_FAILED, base);
      }
      router.replace('/game/result');
    }
  }, [gameState]);

  if (loading) {
    return (<SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}><ActivityIndicator size="large" color={colors.accent} /></SafeAreaView>);
  }

  // Treat a level whose scenes carry no playable content the same as
  // a missing level. dbRowToLevel keeps a placeholder empty scene
  // when every scene was malformed (objects but no questions, etc.) —
  // entering the state machine with it produced a blank, timer-less
  // QUESTION screen whose only exit was the quit X.
  const unplayable = level && level.scenes.every((s) => s.objects.length === 0 || s.questions.length === 0);
  if (!level || unplayable) {
    return (<SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}><Text style={[styles.errorText, { color: tc.textMid }]}>{t('modes.level_not_found')}</Text><Button title={t('modes.go_back')} onPress={() => router.back()} /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            const inGame = gameState === 'MEMORISE' || gameState === 'TRANSITION' || gameState === 'QUESTION' || gameState === 'REVEAL' || gameState === 'SCENE_SCORE';
            if (inGame) setShowQuitConfirm(true);
            else { clearTimeouts(); resetGame(); router.back(); }
          }}
          accessibilityRole="button"
          accessibilityLabel={t('game.quit_aria')}
          hitSlop={12}
        >
          <Text style={[styles.closeButton, { color: tc.textMid }]}>{String.fromCharCode(10005)}</Text>
        </Pressable>
        <Badge label={t('game.level_badge', { number: getPositionForLevelId(level.id) ?? level.levelNumber })} />
        <View style={styles.headerSpacer} />
      </View>

      {gameState === 'READY' && (
        <AnimatedOrView entering={enterFade} style={styles.centered}>
          <Text style={[styles.levelTitle, { color: tc.text }]}>{level.title}</Text>
          <Text style={[styles.levelSubtitle, { color: tc.textMid }]}>{level.scenes.length === 1 ? t('game.scenes_one') : t('game.scenes_many', { count: level.scenes.length })}</Text>
          <Button title={t('game.start')} onPress={handleStart} style={styles.startButton} />
        </AnimatedOrView>
      )}

      {gameState === 'MEMORISE' && currentScene && (
        <AnimatedOrView entering={enterFade} style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime + timerBonus} running={!buyPopupId} onComplete={handleMemoriseComplete} style={styles.timer} />
          {isW6 && mmLevel ? (
            <>
              <MastermindStageIndicator current={mmStageIdx + 1} total={mmLevel.stageCount} />
              <SceneRenderer
                objects={
                  mmLevel.stages[mmStageIdx]?.shapes.map((s) => ({
                    id: s.id, type: s.type, color: s.colour,
                    x: s.position.x, y: s.position.y, size: 32,
                  })) ?? currentScene.objects
                }
                visible={true}
                viewTime={currentScene.viewTime}
              />
            </>
          ) : (
            <>
              <Text style={[styles.memoriseText, { color: tc.textMid }]}>{t('game.memorise_prompt')}</Text>
              <SceneRenderer objects={currentScene.objects} visible={true} viewTime={currentScene.viewTime} />
            </>
          )}
          <SlowTimeButton used={usedPowerUps.slowTime} onUse={handleSlowTime} />
        </AnimatedOrView>
      )}

      {gameState === 'TRANSITION' && (
        <AnimatedOrView entering={enterFade} style={styles.centered}>
          <AnimatedBlink expression="blank" size={80} entrance="spring" />
          <View style={[styles.blankContainer, { marginTop: 16 }]}>
            <Text style={[styles.blankText, { color: tc.accent }]}>{t('game.go_blank')}</Text>
            <Text style={[styles.blankSubtext, { color: tc.textLight }]}>{t('game.go_blank_sub')}</Text>
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
          <Text style={[styles.sceneScoreTitle, { color: tc.text }]}>{t('game.scene_complete')}</Text>
          <Text style={[styles.sceneScoreBody, { color: tc.textMid }]}>{t('game.scene_score_body', { correct: answers.filter((a) => a.isCorrect).length, total: answers.length })}</Text>
          <Button title={t('game.next_scene')} onPress={handleNextScene} style={styles.startButton} />
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
            <Pressable
              style={styles.quitBackdropTouch}
              onPress={() => setShowQuitConfirm(false)}
              accessibilityRole="button"
              accessibilityLabel={t('game.quit_dismiss_aria')}
            />
            <View style={[styles.quitCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.quitTitle, { color: colors.text }]}>{t('game.quit_title')}</Text>
              <Text style={[styles.quitMessage, { color: colors.textMid }]}>
                {t('game.quit_body_plus')}
              </Text>
              <Pressable
                style={[styles.quitLeaveBtn, { backgroundColor: colors.wrong }]}
                onPress={() => {
                  setShowQuitConfirm(false);
                  clearTimeouts();
                  // Quitting no longer costs a life for anyone —
                  // punishing a player for backing out of a level they
                  // weren't ready for read as hostile, especially in
                  // the first session (see docs/RESCUE_PLAN.md 2.2).
                  resetGame();
                  router.back();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('game.quit_leave_aria_plus')}
              >
                <Text style={styles.quitBtnText}>{t('game.quit_leave')}</Text>
              </Pressable>
              <Pressable
                style={[styles.quitLeaveBtn, { backgroundColor: colors.accent }]}
                onPress={() => setShowQuitConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel={t('game.keep_playing_aria')}
              >
                <Text style={styles.quitBtnText}>{t('game.keep_playing')}</Text>
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
