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
import { generateSpeedChallenge } from '@/src/utils/speedChallenge';
import { getTodayDateString } from '@/src/utils/dailyChallenge';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import type { Level, Scene } from '@/src/types/game';

const isWeb = Platform.OS === 'web';

function buildSpeedLevel(dateStr: string): Level {
  const ch = generateSpeedChallenge(dateStr);
  const scenes: Scene[] = ch.scenes.map((s) => ({ id: s.id, viewTime: s.viewTime, objects: s.objects, questions: [s.question] }));
  return { id: `speed-${dateStr}`, worldId: 0, levelNumber: 0, title: 'Speed Round', scenes, requiredScore: 60, parScore: 100 };
}

function SpeedGameScreen() {
  const router = useRouter();
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateStr = getTodayDateString();
  const speedLevel = useMemo(() => buildSpeedLevel(dateStr), [dateStr]);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const { gameState, currentSceneIndex, currentQuestionIndex, selectedOption, revealedCorrect, answers, startLevel, setGameState, selectOption, revealAnswer, nextQuestion, nextScene, resetGame, addGems, addStars, incrementStreak, score } = useGameStore();
  const loseLife = useGameStore((s) => s.loseLife);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  useEffect(() => { resetGame(); }, []);
  useEffect(() => {
    if (gameState === 'MEMORISE' || gameState === 'QUESTION' || gameState === 'REVEAL' || gameState === 'TRANSITION') {
      const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 100) / 10), 100);
      return () => clearInterval(id);
    }
  }, [gameState, startTime]);

  const currentScene = speedLevel.scenes[currentSceneIndex];
  const currentQuestion = currentScene?.questions[currentQuestionIndex];

  const clearTimeouts = useCallback(() => {
    if (revealTimeout.current) { clearTimeout(revealTimeout.current); revealTimeout.current = null; }
    if (transitionTimeout.current) { clearTimeout(transitionTimeout.current); transitionTimeout.current = null; }
  }, []);
  useEffect(() => { return clearTimeouts; }, [clearTimeouts]);

  const handleStart = useCallback(() => { startLevel(speedLevel); }, [speedLevel, startLevel]);
  const handleMemoriseComplete = useCallback(() => { setGameState('TRANSITION'); clearTimeouts(); transitionTimeout.current = setTimeout(() => setGameState('QUESTION'), 500); }, [setGameState, clearTimeouts]);

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
      revealTimeout.current = setTimeout(() => { nextQuestion(); }, 300);
    }, 200);
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, currentQuestion, clearTimeouts]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption === null) { selectOption(null); revealAnswer(); if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); clearTimeouts(); revealTimeout.current = setTimeout(() => { nextQuestion(); }, 300); }
  }, [selectedOption, selectOption, revealAnswer, nextQuestion, clearTimeouts]);

  useEffect(() => {
    if (gameState === 'SCENE_SCORE') { nextScene(); }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'COMPLETE') { const stars = getStarsForScore(score, speedLevel); addGems(GEM_REWARDS[stars]); addStars(stars); incrementStreak(); if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.replace('/game/result'); }
    if (gameState === 'FAILED') { router.replace('/game/result'); }
  }, [gameState]);

  const formatElapsed = (t: number) => { const m = Math.floor(t / 60); const s = (t % 60).toFixed(1); return m > 0 ? `${m}:${s.padStart(4, '0')}` : `${s}s`; };
  const lightning = String.fromCodePoint(0x26A1);

  if (gameState === 'READY') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => { clearTimeouts(); resetGame(); router.back(); }}>
            <Text style={styles.closeButton}>{String.fromCharCode(10005)}</Text>
          </Pressable>
          <Badge label="SPEED ROUND" />

          <View style={styles.headerSpacer} />
        </View>
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.centered}>
          <Text style={styles.modeIcon}>{lightning}</Text>
          <Text style={styles.levelTitle}>Speed Round</Text>
          <Text style={styles.levelSubtitle}>10 scenes {String.fromCharCode(183)} 2 seconds each</Text>
          <Text style={styles.levelSubtitle}>1 question per scene</Text>
          <Button title="Start" onPress={handleStart} style={styles.startButton} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!currentScene || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.levelSubtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { setShowQuitConfirm(true); }}>
          <Text style={styles.closeButton}>{String.fromCharCode(10005)}</Text>
        </Pressable>
        <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
        <Text style={styles.sceneCounter}>{currentSceneIndex + 1}/10</Text>
      </View>

      <View style={styles.dotsRow}>
        {speedLevel.scenes.map((_, i) => {
          let dotStyle: { backgroundColor: string } = styles.dotDefault;
          if (i < currentSceneIndex) { const answer = answers[i]; dotStyle = answer?.isCorrect ? styles.dotCorrect : styles.dotWrong; }
          else if (i === currentSceneIndex) { dotStyle = styles.dotActive; }
          return <View key={i} style={[styles.dot, dotStyle]} />;
        })}
      </View>

      {gameState === 'MEMORISE' && currentScene && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime} running={true} onComplete={handleMemoriseComplete} style={styles.timer} />
          <SceneRenderer objects={currentScene.objects} visible={true} />
        </Animated.View>
      )}
      {gameState === 'TRANSITION' && (<Animated.View entering={isWeb ? undefined : FadeIn} exiting={isWeb ? undefined : FadeOut} style={styles.centered}><Text style={styles.blankText}>Go blank!</Text></Animated.View>)}
      {gameState === 'QUESTION' && currentQuestion && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={styles.gameArea}>
          <CountdownTimer duration={currentQuestion.timeLimit} running={true} onComplete={handleQuestionTimeout} style={styles.timer} />
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={null} onSelect={handleSelectOption} questionNumber={currentSceneIndex + 1} totalQuestions={10} />
        </Animated.View>
      )}
      {gameState === 'REVEAL' && currentQuestion && (
        <View style={styles.gameArea}>
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={revealedCorrect} onSelect={() => {}} questionNumber={currentSceneIndex + 1} totalQuestions={10} />
        </View>
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

export default SpeedGameScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  closeButton: { fontSize: typography.sizes.xl, color: colors.textMid, padding: spacing.sm },
  headerSpacer: { width: 36 },
  timerText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.accent },
  sceneCounter: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.textMid },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 999 },
  dotDefault: { backgroundColor: 'rgba(0,0,0,0.06)' },
  dotActive: { backgroundColor: colors.accent },
  dotCorrect: { backgroundColor: colors.correct },
  dotWrong: { backgroundColor: colors.wrong },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  gameArea: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  timer: { marginBottom: spacing.sm },
  modeIcon: { fontSize: 48 },
  levelTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  levelSubtitle: { fontSize: typography.sizes.md, color: colors.textMid },
  startButton: { minWidth: 160, marginTop: spacing.lg },
  blankText: { fontSize: typography.sizes.display, fontWeight: typography.weights.black, color: colors.accent },
  quitBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  quitBackdropTouch: { ...StyleSheet.absoluteFillObject },
  quitCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  quitTitle: { fontSize: 20, fontWeight: '700' },
  quitMessage: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  quitLeaveBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', width: '100%' },
  quitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
