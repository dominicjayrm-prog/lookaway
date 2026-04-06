/**
 * Endless Mode — Procedurally generated levels with increasing difficulty.
 * One wrong answer ends the run. Score = highest level reached.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { generateEndlessScene, getDifficultyLabel, getDifficultyColor } from '@/src/utils/endlessGenerator';
import { incrementWeeklyProgress } from '@/src/utils/weeklyChallenges';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Scene, Question } from '@/src/types/game';

const isWeb = Platform.OS === 'web';
const STORAGE_KEY = 'blanked_endless_best';

type EndlessState = 'READY' | 'MEMORISE' | 'TRANSITION' | 'QUESTION' | 'REVEAL' | 'GAME_OVER';

export default function EndlessGame() {
  const router = useRouter();
  const { colors } = useTheme();
  const addGems = useGameStore(s => s.addGems);

  const [state, setState] = useState<EndlessState>('READY');
  const [level, setLevel] = useState(1);
  const [scene, setScene] = useState<Scene | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<number | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [gemsEarned, setGemsEarned] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load best score
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setBestLevel(parseInt(val, 10) || 0);
    });
  }, []);

  const clearTimeouts = useCallback(() => {
    if (transitionTimeout.current) { clearTimeout(transitionTimeout.current); transitionTimeout.current = null; }
    if (revealTimeout.current) { clearTimeout(revealTimeout.current); revealTimeout.current = null; }
  }, []);
  useEffect(() => clearTimeouts, [clearTimeouts]);

  const startLevel = useCallback((lvl: number) => {
    const newScene = generateEndlessScene(lvl);
    setScene(newScene);
    setQuestionIndex(0);
    setSelectedOption(null);
    setRevealedCorrect(null);
    setState('MEMORISE');
  }, []);

  const handleStart = useCallback(() => {
    setLevel(1);
    setTotalCorrect(0);
    setTotalAnswered(0);
    setGemsEarned(0);
    startLevel(1);
  }, [startLevel]);

  const handleMemoriseComplete = useCallback(() => {
    setState('TRANSITION');
    clearTimeouts();
    transitionTimeout.current = setTimeout(() => setState('QUESTION'), 800);
  }, [clearTimeouts]);

  const endRun = useCallback(async (reachedLevel: number) => {
    setState('GAME_OVER');
    // Calculate gems: 1 per level cleared
    const gems = Math.max(0, reachedLevel - 1);
    setGemsEarned(gems);
    if (gems > 0) addGems(gems);

    // Save best
    if (reachedLevel - 1 > bestLevel) {
      const newBest = reachedLevel - 1;
      setBestLevel(newBest);
      await AsyncStorage.setItem(STORAGE_KEY, String(newBest));
    }

    // Track weekly progress
    incrementWeeklyProgress('levels_completed');
    incrementWeeklyProgress('modes_played');

    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [addGems, bestLevel]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null || !scene) return;
    setSelectedOption(index);

    const currentQuestion = scene.questions[questionIndex];
    const isCorrect = index === currentQuestion.correctIndex;

    clearTimeouts();
    transitionTimeout.current = setTimeout(() => {
      setRevealedCorrect(currentQuestion.correctIndex);
      setTotalAnswered(a => a + 1);

      if (isCorrect) {
        setTotalCorrect(c => c + 1);
        if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setState('REVEAL');

      revealTimeout.current = setTimeout(() => {
        if (!isCorrect) {
          // Wrong answer — game over
          endRun(level);
        } else {
          // Correct — next question or next level
          const nextQ = questionIndex + 1;
          if (nextQ < scene.questions.length) {
            setQuestionIndex(nextQ);
            setSelectedOption(null);
            setRevealedCorrect(null);
            setState('QUESTION');
          } else {
            // All questions correct — advance to next level
            const nextLvl = level + 1;
            setLevel(nextLvl);
            if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            startLevel(nextLvl);
          }
        }
      }, 800);
    }, 300);
  }, [selectedOption, scene, questionIndex, clearTimeouts, level, startLevel, endRun]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption !== null || !scene) return;
    setSelectedOption(null);
    setRevealedCorrect(scene.questions[questionIndex].correctIndex);
    setTotalAnswered(a => a + 1);
    setState('REVEAL');
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    clearTimeouts();
    revealTimeout.current = setTimeout(() => endRun(level), 800);
  }, [selectedOption, scene, questionIndex, clearTimeouts, level, endRun]);

  const handleShare = useCallback(async () => {
    const levelsCleared = Math.max(0, level - 1);
    const text = `Blanked Endless Mode\nI reached Level ${levelsCleared}! ${getDifficultyLabel(levelsCleared)} difficulty\n${totalCorrect}/${totalAnswered} correct\nplayblanked.app`;
    try { await Share.share({ message: text }); } catch {}
  }, [level, totalCorrect, totalAnswered]);

  const currentQuestion = scene?.questions[questionIndex];
  const totalQuestions = scene?.questions.length ?? 0;
  const levelsCleared = Math.max(0, level - 1);
  const isNewBest = levelsCleared > bestLevel && state === 'GAME_OVER';

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => {
          if (state === 'MEMORISE' || state === 'TRANSITION' || state === 'QUESTION' || state === 'REVEAL') {
            setShowQuitConfirm(true);
          } else {
            clearTimeouts();
            router.back();
          }
        }}>
          <Text style={[st.closeBtn, { color: colors.textMid }]}>{String.fromCharCode(10005)}</Text>
        </Pressable>
        {state !== 'READY' && state !== 'GAME_OVER' && (
          <Badge label={`LEVEL ${level}`} />
        )}
        {state !== 'READY' && state !== 'GAME_OVER' && (
          <View style={[st.diffBadge, { backgroundColor: getDifficultyColor(level) + '20' }]}>
            <Text style={[st.diffText, { color: getDifficultyColor(level) }]}>{getDifficultyLabel(level)}</Text>
          </View>
        )}
        {(state === 'READY' || state === 'GAME_OVER') && <View style={st.headerSpacer} />}
      </View>

      {/* READY state */}
      {state === 'READY' && (
        <View style={st.centered}>
          <Text style={st.infinityIcon}>{'\u221E'}</Text>
          <Text style={[st.readyTitle, { color: colors.text }]}>Endless Mode</Text>
          <Text style={[st.readyDesc, { color: colors.textMid }]}>
            Levels get harder as you go.{'\n'}One wrong answer ends the run.
          </Text>
          {bestLevel > 0 && (
            <View style={[st.bestBadge, { backgroundColor: colors.goldSoft, borderColor: colors.gold + '30' }]}>
              <Text style={[st.bestText, { color: colors.gold }]}>Best: Level {bestLevel}</Text>
            </View>
          )}
          <Button title="Start run" onPress={handleStart} style={st.startBtn} />
        </View>
      )}

      {/* MEMORISE */}
      {state === 'MEMORISE' && scene && (
        <View style={st.gameArea}>
          <CountdownTimer duration={scene.viewTime} running onComplete={handleMemoriseComplete} style={st.timer} />
          <Text style={[st.memoriseText, { color: colors.textMid }]}>Memorise this scene!</Text>
          <SceneRenderer objects={scene.objects} visible viewTime={scene.viewTime} />
        </View>
      )}

      {/* TRANSITION */}
      {state === 'TRANSITION' && (
        <View style={st.centered}>
          <View style={st.blankContainer}>
            <Text style={[st.blankText, { color: colors.text }]}>Go blank!</Text>
            <Text style={[st.blankSubtext, { color: colors.textMid }]}>What do you remember?</Text>
          </View>
        </View>
      )}

      {/* QUESTION */}
      {state === 'QUESTION' && currentQuestion && (
        <View style={st.gameArea}>
          <CountdownTimer duration={currentQuestion.timeLimit} running onComplete={handleQuestionTimeout} style={st.timer} />
          <QuestionCard
            questionText={currentQuestion.text}
            options={[...currentQuestion.options]}
            selectedIndex={selectedOption}
            revealedCorrectIndex={null}
            onSelect={handleSelectOption}
            questionNumber={questionIndex + 1}
            totalQuestions={totalQuestions}
          />
        </View>
      )}

      {/* REVEAL */}
      {state === 'REVEAL' && currentQuestion && (
        <View style={st.gameArea}>
          <QuestionCard
            questionText={currentQuestion.text}
            options={[...currentQuestion.options]}
            selectedIndex={selectedOption}
            revealedCorrectIndex={revealedCorrect}
            onSelect={() => {}}
            questionNumber={questionIndex + 1}
            totalQuestions={totalQuestions}
          />
        </View>
      )}

      {/* GAME OVER */}
      {state === 'GAME_OVER' && (
        <View style={st.centered}>
          <Text style={st.gameOverIcon}>{levelsCleared > 0 ? '\u{1F4AA}' : '\u{1F614}'}</Text>
          <Text style={[st.gameOverTitle, { color: colors.text }]}>Game Over</Text>

          {isNewBest && (
            <View style={[st.newBestBadge, { backgroundColor: colors.goldSoft }]}>
              <Text style={[st.newBestText, { color: colors.gold }]}>New personal best!</Text>
            </View>
          )}

          <View style={[st.resultCard, { backgroundColor: colors.card }]}>
            <View style={st.resultRow}>
              <Text style={[st.resultLabel, { color: colors.textMid }]}>Levels cleared</Text>
              <Text style={[st.resultValue, { color: colors.text }]}>{levelsCleared}</Text>
            </View>
            <View style={[st.resultDivider, { backgroundColor: colors.border }]} />
            <View style={st.resultRow}>
              <Text style={[st.resultLabel, { color: colors.textMid }]}>Questions correct</Text>
              <Text style={[st.resultValue, { color: colors.correct }]}>{totalCorrect}/{totalAnswered}</Text>
            </View>
            <View style={[st.resultDivider, { backgroundColor: colors.border }]} />
            <View style={st.resultRow}>
              <Text style={[st.resultLabel, { color: colors.textMid }]}>Difficulty reached</Text>
              <Text style={[st.resultValue, { color: getDifficultyColor(levelsCleared) }]}>{getDifficultyLabel(levelsCleared)}</Text>
            </View>
            <View style={[st.resultDivider, { backgroundColor: colors.border }]} />
            <View style={st.resultRow}>
              <Text style={[st.resultLabel, { color: colors.textMid }]}>Gems earned</Text>
              <Text style={[st.resultValue, { color: colors.gold }]}>{gemsEarned} {'\u{1F48E}'}</Text>
            </View>
          </View>

          <View style={st.buttonRow}>
            <Pressable
              style={({ pressed }) => [st.actionBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
              onPress={handleStart}
            >
              <Text style={st.actionBtnText}>Play again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [st.actionBtn, st.actionBtnSecondary, { backgroundColor: colors.surface }, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
              onPress={handleShare}
            >
              <Text style={[st.actionBtnText, { color: colors.text }]}>Share</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.back()} style={st.backLink}>
            <Text style={[st.backLinkText, { color: colors.textMid }]}>Back to Journey</Text>
          </Pressable>
        </View>
      )}

      {/* Quit confirmation */}
      {showQuitConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowQuitConfirm(false)}>
          <View style={st.quitBackdrop}>
            <Pressable style={st.quitBackdropTouch} onPress={() => setShowQuitConfirm(false)} />
            <View style={[st.quitCard, { backgroundColor: colors.card }]}>
              <Text style={[st.quitTitle, { color: colors.text }]}>End run?</Text>
              <Text style={[st.quitMessage, { color: colors.textMid }]}>You've cleared {levelsCleared} level{levelsCleared !== 1 ? 's' : ''}. Your progress will be lost.</Text>
              <View style={st.quitButtons}>
                <Pressable style={[st.quitBtn, { backgroundColor: colors.surface }]} onPress={() => setShowQuitConfirm(false)}>
                  <Text style={[st.quitBtnText, { color: colors.text }]}>Keep going</Text>
                </Pressable>
                <Pressable style={[st.quitBtn, { backgroundColor: colors.wrong }]} onPress={() => { setShowQuitConfirm(false); clearTimeouts(); endRun(level); }}>
                  <Text style={[st.quitBtnText, { color: '#FFF' }]}>End run</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { fontSize: 20, padding: 4 },
  headerSpacer: { width: 28 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  diffText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  gameArea: { flex: 1, paddingHorizontal: 16 },
  timer: { marginBottom: 8 },

  infinityIcon: { fontSize: 52, color: '#6C5CE7', marginBottom: 8, fontWeight: '200' },
  readyTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  readyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  bestBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  bestText: { fontSize: 14, fontWeight: '700' },
  startBtn: { minWidth: 200 },

  memoriseText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 8, marginTop: 4 },
  blankContainer: { alignItems: 'center' },
  blankText: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  blankSubtext: { fontSize: 14 },

  gameOverIcon: { fontSize: 48, marginBottom: 8 },
  gameOverTitle: { fontSize: 28, fontWeight: '900', marginBottom: 12 },
  newBestBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, marginBottom: 16 },
  newBestText: { fontSize: 14, fontWeight: '800' },

  resultCard: { width: '100%', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  resultLabel: { fontSize: 13, fontWeight: '500' },
  resultValue: { fontSize: 15, fontWeight: '800' },
  resultDivider: { height: 1 },

  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  actionBtnSecondary: {},
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  backLink: { marginTop: 16, paddingVertical: 8 },
  backLinkText: { fontSize: 13, fontWeight: '600' },

  quitBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  quitBackdropTouch: { ...StyleSheet.absoluteFillObject },
  quitCard: { width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, alignItems: 'center', zIndex: 1 },
  quitTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  quitMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  quitButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  quitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  quitBtnText: { fontSize: 14, fontWeight: '700' },
});
