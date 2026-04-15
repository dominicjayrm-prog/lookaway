import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { QuestionCard } from '@/src/components/QuestionCard';
import { PowerUpBar } from '@/src/components/PowerUpBar';
import { SlowTimeButton } from '@/src/components/SlowTimeButton';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import PowerUpFlash from '@/src/components/PowerUpFlash';
import { QuitConfirmModal } from '@/src/components/QuitConfirmModal';
import { useClassicPowerUps } from '@/src/hooks/useClassicPowerUps';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { fetchLevelById } from '@/src/data/levels';
import {
  pickChallengeLevels,
  insertChallengeRow,
  recordChallengeScore,
  type ChallengeDifficulty,
} from '@/src/utils/challengeFlow';
import type { Level, Scene } from '@/src/types/game';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import { log } from '@/src/lib/logger';

type Phase = 'loading' | 'ready' | 'memorise' | 'transition' | 'question' | 'reveal' | 'scene_done' | 'complete' | 'error';

interface Answer { correct: boolean; }

function ChallengeGameScreen() {
  const { challengeId, friendId, mode: modeParam, difficulty: difficultyParam } = useLocalSearchParams<{ challengeId?: string; friendId?: string; mode?: string; difficulty?: string }>();
  const isChallenger = modeParam === 'create';
  const difficulty: ChallengeDifficulty = (difficultyParam === 'easy' || difficultyParam === 'hard') ? difficultyParam : 'medium';
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;

  const [phase, setPhase] = useState<Phase>('loading');
  const [levels, setLevels] = useState<Level[]>([]);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealedCorrect, setRevealedCorrect] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [dbChallengeId, setDbChallengeId] = useState<string | null>(challengeId ?? null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLevel = levels[sceneIdx];
  const currentScene = currentLevel?.scenes[0];
  const currentQuestion = currentScene?.questions[questionIdx];
  const totalScenes = levels.length;
  const totalQuestions = currentScene?.questions.length ?? 0;

  // Classic power-ups — slowTime, peek, fiftyFifty, skip. Friend
  // challenges use the same MEMORISE → QUESTION → REVEAL flow as
  // campaign levels, so we re-use the shared hook that wires all the
  // state + handlers identically.
  const selectOptionRef = useRef<(index: number) => void>(() => {});
  const dispatchSelect = useCallback((index: number) => selectOptionRef.current(index), []);
  const pu = useClassicPowerUps({ onSkip: dispatchSelect, currentQuestion });

  // Clear timeout on unmount
  useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

  // Load levels. Challenger path no longer inserts a DB row here —
  // it just picks the ids so the challenger can play their half
  // locally first. The row is inserted (with the challenger's real
  // score) later in `handleNextScene` when all scenes are finished.
  // That prevents the phantom "pending with no score" row from
  // showing up on both sides if the challenger abandons mid-run.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        if (isChallenger && friendId) {
          const ids = await pickChallengeLevels(userId!, friendId, difficulty);
          if (cancelled || ids.length === 0) { if (!cancelled) setPhase('error'); return; }
          setLevelIds(ids);
          const loaded = await Promise.all(ids.map((id) => fetchLevelById(id)));
          if (cancelled) return;
          const valid = loaded.filter((l): l is Level => l !== undefined);
          if (valid.length === 0) { setPhase('error'); return; }
          setLevels(valid);
          setPhase('ready');
        } else if (challengeId) {
          // Challenged: fetch existing challenge levels
          const { data: ch } = await supabase.from('friend_challenges').select('level_ids').eq('id', challengeId).single();
          if (!ch?.level_ids || cancelled) { if (!cancelled) setPhase('error'); return; }
          setLevelIds(ch.level_ids);

          const loaded = await Promise.all(ch.level_ids.map((id: string) => fetchLevelById(id)));
          if (cancelled) return;
          const valid = loaded.filter((l): l is Level => l !== undefined);
          if (valid.length === 0) { setPhase('error'); return; }
          setLevels(valid);
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch { if (!cancelled) setPhase('error'); }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, friendId, challengeId, isChallenger, difficulty]);

  const startChallenge = useCallback(() => {
    setSceneIdx(0);
    setQuestionIdx(0);
    setAnswers([]);
    setPhase('memorise');
    pu.resetPowerUps();
  }, [pu]);

  const handleMemoriseComplete = useCallback(() => {
    setPhase('transition');
    timeoutRef.current = setTimeout(() => setPhase('question'), 800);
  }, []);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(index);
    timeoutRef.current = setTimeout(() => {
      const correct = index === currentQuestion.correctIndex;
      setRevealedCorrect(currentQuestion.correctIndex);
      setAnswers(prev => [...prev, { correct }]);
      timeoutRef.current = setTimeout(() => {
        setSelectedOption(null);
        setRevealedCorrect(null);
        pu.clearHiddenOptions();
        const nextQ = questionIdx + 1;
        if (nextQ < totalQuestions) {
          setQuestionIdx(nextQ);
          setPhase('question');
        } else {
          setPhase('scene_done');
        }
      }, 800);
    }, 300);
  }, [selectedOption, currentQuestion, questionIdx, totalQuestions, pu]);

  // Keep the select ref in sync so Skip routes to the latest closure.
  useEffect(() => { selectOptionRef.current = handleSelectOption; }, [handleSelectOption]);

  // Reset per-scene power-up state when moving to a new scene so
  // slowTime / peek / fiftyFifty / skip become available again.
  useEffect(() => { pu.resetPowerUps(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sceneIdx]);

  const handleQuestionTimeout = useCallback(() => {
    if (selectedOption !== null || !currentQuestion) return;
    setRevealedCorrect(currentQuestion.correctIndex);
    setAnswers(prev => [...prev, { correct: false }]);
    timeoutRef.current = setTimeout(() => {
      setSelectedOption(null);
      setRevealedCorrect(null);
      const nextQ = questionIdx + 1;
      if (nextQ < totalQuestions) {
        setQuestionIdx(nextQ);
      } else {
        setPhase('scene_done');
      }
    }, 800);
  }, [selectedOption, currentQuestion, questionIdx, totalQuestions]);

  const handleNextScene = useCallback(async () => {
    const next = sceneIdx + 1;
    if (next < totalScenes) {
      setSceneIdx(next);
      setQuestionIdx(0);
      setSelectedOption(null);
      setRevealedCorrect(null);
      setPhase('memorise');
    } else {
      // All scenes done — calculate and save score
      setPhase('complete');
      const totalCorrect = answers.length > 0 ? answers.filter(a => a.correct).length : 0;
      const totalQ = levels.reduce((sum, l) => sum + (l.scenes[0]?.questions.length ?? 0), 0);
      const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
      const stars = pct === 100 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;

      if (!userId) return;

      let resultChallengeId: string | null = dbChallengeId;
      if (isChallenger && !dbChallengeId && friendId) {
        // Challenger path — insert the row NOW, with a real score, and
        // fire the "you've been challenged" notification to the friend.
        const id = await insertChallengeRow({
          challengerId: userId,
          challengedId: friendId,
          levelIds,
          difficulty,
          challengerScore: pct,
          challengerStars: stars,
          modeName: 'Classic',
        });
        if (id) { setDbChallengeId(id); resultChallengeId = id; }
      } else if (dbChallengeId) {
        // Challenged player finishing their half — update the row via
        // the existing recordChallengeScore path.
        const saved = await recordChallengeScore(dbChallengeId, userId, pct, stars);
        if (!saved) log.warn('challenges', 'recordChallengeScore returned false', { dbChallengeId, userId });
      }

      // Route to the result screen. The result screen hides scores +
      // the win/loss verdict until BOTH players have submitted and
      // updates live via a postgres_changes subscription.
      if (resultChallengeId) {
        setTimeout(() => router.replace({ pathname: '/game/challenge-result', params: { challengeId: resultChallengeId as string } }), 400);
      }
    }
  }, [sceneIdx, totalScenes, answers, levels, dbChallengeId, userId, isChallenger, friendId, levelIds, difficulty, router]);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  /** Shared "leave this challenge?" guard. Pops the styled quit modal
   *  so premium users see the same polite copy they get on every
   *  other mode. No-ops in loading/ready/complete because there's
   *  nothing to warn about. */
  const handleAbandon = useCallback(() => {
    if (phase === 'loading' || phase === 'error' || phase === 'ready' || phase === 'complete') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      router.back();
      return;
    }
    setShowQuitConfirm(true);
  }, [phase, router]);

  const confirmLeave = useCallback(() => {
    setShowQuitConfirm(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    router.back();
  }, [router]);

  // Score calculation for complete phase
  const totalCorrect = answers.filter(a => a.correct).length;
  const totalQ = levels.reduce((sum, l) => sum + (l.scenes[0]?.questions.length ?? 0), 0);
  const finalPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  // Completed scenes count for progress bar
  const completedScenes = phase === 'complete' ? totalScenes : sceneIdx;
  const questionsPerScene = levels.map(l => l.scenes[0]?.questions.length ?? 0);
  const sceneOffset = questionsPerScene.slice(0, sceneIdx).reduce((a, b) => a + b, 0);
  const sceneAnswers = answers.slice(sceneOffset, sceneOffset + (questionsPerScene[sceneIdx] ?? 0));
  const sceneCorrect = sceneAnswers.filter(a => a.correct).length;

  if (phase === 'loading') {
    return (<SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.accent} /><Text style={[styles.loadingText, { color: colors.textMid }]}>Setting up challenge...</Text></SafeAreaView>);
  }

  if (phase === 'error') {
    return (<SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}><Text style={[styles.loadingText, { color: colors.wrong }]}>Could not load challenge</Text><Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => router.back()}><Text style={styles.primaryBtnText}>Go back</Text></Pressable></SafeAreaView>);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleAbandon} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.closeX, { color: colors.textMid }]}>{'\u2715'}</Text>
        </Pressable>
        <Text style={[styles.sceneLabel, { color: colors.textMid }]}>Scene {sceneIdx + 1}/{totalScenes}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalScenes }).map((_, i) => (
          <View key={i} style={[styles.progressSeg, { backgroundColor: i < completedScenes ? colors.accent : colors.border }]} />
        ))}
      </View>

      {/* Ready */}
      {phase === 'ready' && (
        <View style={styles.centered}>
          <Text style={[styles.bigTitle, { color: colors.accent }]}>Challenge</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>{totalScenes} scenes, {totalScenes * 5} questions</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={startChallenge}>
            <Text style={styles.primaryBtnText}>Start</Text>
          </Pressable>
        </View>
      )}

      {/* Memorise */}
      {phase === 'memorise' && currentScene && (
        <View style={styles.gameArea}>
          <CountdownTimer duration={currentScene.viewTime + pu.timerBonus} running={!pu.buyPopupId} onComplete={handleMemoriseComplete} style={styles.timer} />
          <Text style={[styles.memoriseText, { color: colors.textMid }]}>Memorise this scene!</Text>
          <SceneRenderer objects={currentScene.objects} visible viewTime={currentScene.viewTime} />
          <SlowTimeButton used={pu.usedPowerUps.slowTime} onUse={pu.handleSlowTime} />
        </View>
      )}

      {/* Transition */}
      {phase === 'transition' && (
        <View style={styles.centered}>
          <Text style={[styles.bigTitle, { color: colors.accent }]}>Go blank!</Text>
        </View>
      )}

      {/* Question */}
      {phase === 'question' && currentQuestion && (
        <View style={styles.gameArea}>
          <CountdownTimer duration={currentQuestion.timeLimit} running={!pu.showPeekScene && !pu.buyPopupId} onComplete={handleQuestionTimeout} style={styles.timer} />
          {pu.showPeekScene && currentScene ? (
            <SceneRenderer objects={currentScene.objects} visible viewTime={currentScene.viewTime} />
          ) : (
            <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={null} onSelect={handleSelectOption} questionNumber={questionIdx + 1} totalQuestions={totalQuestions} hiddenOptions={pu.hiddenOptions} />
          )}
          <PowerUpBar usedThisLevel={pu.usedPowerUps} onUsePowerUp={pu.handleQuestionPowerUp} />
        </View>
      )}

      {/* Reveal */}
      {phase === 'reveal' && currentQuestion && (
        <View style={styles.gameArea}>
          <QuestionCard questionText={currentQuestion.text} options={[...currentQuestion.options]} selectedIndex={selectedOption} revealedCorrectIndex={revealedCorrect} onSelect={() => {}} questionNumber={questionIdx + 1} totalQuestions={totalQuestions} />
        </View>
      )}

      {/* Scene done */}
      {phase === 'scene_done' && (
        <View style={styles.centered}>
          <Text style={[styles.sceneDoneCheck, { color: colors.correct }]}>{'\u2713'} Scene {sceneIdx + 1}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>{sceneCorrect}/{totalQuestions} correct</Text>
          {sceneIdx + 1 < totalScenes ? (
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleNextScene}>
              <Text style={styles.primaryBtnText}>Next scene</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleNextScene}>
              <Text style={styles.primaryBtnText}>See results</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Complete — route straight to the result screen, which
          enforces the "hide until both finish" behaviour. Using a
          momentary loading state here so the route navigation has
          a frame to mount. */}
      {phase === 'complete' && (
        <View style={styles.centered}>
          <Text style={[styles.bigTitle, { color: colors.accent }]}>Nice work!</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>Checking your opponent\u2019s progress\u2026</Text>
        </View>
      )}

      {/* Buy popup pauses game timers via buyPopupId; flash overlay hits
          when a power-up activates. */}
      <BuyPowerUpPopup powerUpId={pu.buyPopupId} onClose={() => pu.setBuyPopupId(null)} onBought={pu.handleBuyPopupPurchased} />
      <PowerUpFlash type={pu.activePowerUp} onDone={pu.clearActivePowerUp} />

      {/* Quit confirmation — leaving a challenge doesn't cost a life
          (progress is just abandoned) so costsLife={false}. The
          non-premium body text varies based on whether you're the
          challenger or the challenged. */}
      <QuitConfirmModal
        visible={showQuitConfirm}
        costsLife={false}
        nonPremiumBody={isChallenger
          ? "Your progress will be lost and no challenge will be sent to your friend."
          : "Your progress will be lost. You can come back later as long as the challenge is still pending."}
        onLeave={confirmLeave}
        onKeepPlaying={() => setShowQuitConfirm(false)}
      />
    </SafeAreaView>
  );
}

export default ChallengeGameScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  closeBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 20 },
  sceneLabel: { fontSize: 13, fontWeight: '700' },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.md },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  gameArea: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  timer: { marginBottom: spacing.sm },
  bigTitle: { fontSize: 28, fontWeight: '800' },
  bigScore: { fontSize: 56, fontWeight: '900' },
  subtitle: { fontSize: 15 },
  memoriseText: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  sceneDoneCheck: { fontSize: 22, fontWeight: '700' },
  sentText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  primaryBtn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, alignItems: 'center', minWidth: 200 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  loadingText: { fontSize: 15, marginTop: 16, textAlign: 'center' },
});
