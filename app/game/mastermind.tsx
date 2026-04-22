/**
 * Mastermind gameplay screen — dedicated flow for Classic World 6.
 *
 * Instead of the standard single-scene memorise flow, this screen:
 *   1. Shows stages sequentially (2-3 stages per level)
 *   2. Brief transition between stages (0.5s dim)
 *   3. "Go blank" transition
 *   4. Questions with optional stage badge (tells player which stage to recall)
 *   5. Score → navigate to result screen
 *
 * Routed from [levelId].tsx when the level ID starts with 'w6-'.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { useGameStore } from '@/src/store';
import { getMastermindLevel, type MastermindLevel, type MastermindQuestion } from '@/src/data/mastermindLevels';
import { MastermindSceneCard } from '@/src/components/MastermindSceneCard';
import { MastermindStageIndicator } from '@/src/components/MastermindStageIndicator';
import { useMastermindStages } from '@/src/hooks/useMastermindStages';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { MastermindBlinkUnlock } from '@/src/components/MastermindBlinkUnlock';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const GOLD = '#D4A012';

export default function MastermindGameScreen() {
  const { levelNum: levelNumParam } = useLocalSearchParams<{ levelNum: string }>();
  const levelNum = parseInt(levelNumParam ?? '1', 10);
  const router = useRouter();
  const { colors } = useTheme();

  const [level, setLevel] = useState<MastermindLevel | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showLegendaryUnlock, setShowLegendaryUnlock] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load level data
  useEffect(() => {
    const data = getMastermindLevel(levelNum);
    setLevel(data);
    setQuestionIndex(0);
    setSelectedOption(null);
    setRevealed(false);
    setCorrectCount(0);
    setTotalAnswered(0);
  }, [levelNum]);

  const stages = useMastermindStages({
    stageCount: level?.stageCount ?? 2,
    secondsPerStage: level?.secondsPerStage ?? 3,
  });

  const currentQuestion: MastermindQuestion | undefined = level?.questions[questionIndex];
  const totalQuestions = level?.questions.length ?? 0;

  const handleStart = useCallback(() => {
    stages.start();
  }, [stages]);

  const handleSelectOption = useCallback((index: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(index);
    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    setRevealed(true);
    setTotalAnswered((t) => t + 1);

    // Auto-advance after reveal
    revealTimer.current = setTimeout(() => {
      if (questionIndex + 1 < totalQuestions) {
        setQuestionIndex((i) => i + 1);
        setSelectedOption(null);
        setRevealed(false);
      } else {
        // All questions done — navigate to result
        const pct = Math.round((correctCount + (isCorrect ? 1 : 0)) / totalQuestions * 100);
        const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;

        // Record in game store
        const store = useGameStore.getState();
        store.recordLevelComplete(`w6-l${levelNum}`, stars, pct);

        // Check if all 40 levels are now complete → legendary unlock
        if (levelNum === 40) {
          let allDone = true;
          for (let i = 1; i <= 40; i++) {
            if (!store.levelProgress[`w6-l${i}`]) { allDone = false; break; }
          }
          if (allDone && !store.ownedCosmetics.includes('expr_mastermind')) {
            store.unlockCosmetic('expr_mastermind');
            setShowLegendaryUnlock(true);
            return; // Don't navigate yet — the celebration handles it
          }
        }

        router.replace({
          pathname: '/game/result',
          params: { levelId: `w6-l${levelNum}` },
        });
      }
    }, 1200);
  }, [selectedOption, currentQuestion, questionIndex, totalQuestions, correctCount, levelNum, router]);

  // Cleanup
  useEffect(() => {
    return () => { if (revealTimer.current) clearTimeout(revealTimer.current); };
  }, []);

  if (!level) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  // ── IDLE: Ready screen ──
  if (stages.phase === 'idle') {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <View style={st.centered}>
          <View style={[st.badge, { backgroundColor: 'rgba(212,160,18,0.12)' }]}>
            <Text style={st.badgeText}>{t('challenge.mastermind_badge')}</Text>
          </View>
          <Text style={[st.readyTitle, { color: colors.text }]}>Level {levelNum}</Text>
          <Text style={[st.readySub, { color: colors.textMid }]}>
            {level.stageCount} stages · {level.secondsPerStage}s each · {totalQuestions} questions
          </Text>
          <Pressable
            style={[st.playButton, { backgroundColor: GOLD }]}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel={t('modals.start_level_aria')}
          >
            <Text style={st.playButtonText}>{t('challenge.play')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── MEMORISING: Show current stage ──
  if (stages.phase === 'memorising' || stages.phase === 'transitioning') {
    const stageData = level.stages[stages.currentStageIndex];
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <MastermindStageIndicator current={stages.currentStageIndex + 1} total={level.stageCount} />
        <View style={st.centered}>
          {stageData && (
            <MastermindSceneCard
              shapes={stageData.shapes}
              opacity={stages.stageOpacity}
            />
          )}
        </View>
        {stages.phase === 'transitioning' && (
          <View style={st.transitionOverlay}>
            <Text style={st.transitionText}>STAGE {stages.currentStageIndex + 2}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── BLANK: "Look Away!" ──
  if (stages.phase === 'blank') {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <View style={st.centered}>
          <Text style={[st.blankText, { color: GOLD }]}>{t('challenge.look_away')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── QUESTIONING: Show questions with stage badge ──
  if (stages.phase === 'questioning' && currentQuestion) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <View style={st.questionHeader}>
          <Text style={[st.questionProgress, { color: colors.textMid }]}>
            {questionIndex + 1} / {totalQuestions}
          </Text>
        </View>
        <View style={st.centered}>
          {/* Stage badge */}
          {currentQuestion.targetStage && (
            <View style={st.stageBadge}>
              <Text style={st.stageBadgeText}>STAGE {currentQuestion.targetStage}</Text>
            </View>
          )}
          <Text style={[st.questionText, { color: colors.text }]}>{currentQuestion.text}</Text>

          {/* Options */}
          <View style={st.optionsContainer}>
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === currentQuestion.correctIndex;
              let bg = colors.card;
              let border = colors.border;
              let textColor = colors.text;

              if (revealed) {
                if (isCorrect) {
                  bg = 'rgba(0,184,148,0.12)';
                  border = '#00B894';
                  textColor = '#00B894';
                } else if (isSelected && !isCorrect) {
                  bg = 'rgba(255,107,107,0.12)';
                  border = '#FF6B6B';
                  textColor = '#FF6B6B';
                }
              } else if (isSelected) {
                bg = 'rgba(212,160,18,0.12)';
                border = GOLD;
              }

              return (
                <Pressable
                  key={i}
                  style={[st.optionButton, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handleSelectOption(i)}
                  disabled={selectedOption !== null}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
                >
                  <Text style={[st.optionText, { color: textColor }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <>
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]}>
        <View style={st.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </SafeAreaView>
      <MastermindBlinkUnlock
        visible={showLegendaryUnlock}
        onDismiss={() => {
          setShowLegendaryUnlock(false);
          router.replace({ pathname: '/game/result', params: { levelId: `w6-l${levelNum}` } });
        }}
      />
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },

  // Ready
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 16 },
  badgeText: { fontSize: 9, fontWeight: '800', color: GOLD, letterSpacing: 1.5 },
  readyTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  readySub: { fontSize: 13, marginBottom: 32, textAlign: 'center' },
  playButton: { paddingHorizontal: 48, paddingVertical: 14, borderRadius: borderRadius.md },
  playButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Stage transition overlay
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  transitionText: { fontSize: 18, fontWeight: '800', color: GOLD, letterSpacing: 2 },

  // Blank
  blankText: { fontSize: 28, fontWeight: '800' },

  // Questions
  questionHeader: { alignItems: 'center', paddingTop: spacing.md },
  questionProgress: { fontSize: 12, fontWeight: '600' },
  stageBadge: {
    alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(212,160,18,0.1)', marginBottom: 8,
  },
  stageBadgeText: { fontSize: 9, fontWeight: '700', color: GOLD },
  questionText: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 24, lineHeight: 26 },
  optionsContainer: { width: '100%', gap: 10 },
  optionButton: {
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: borderRadius.md, borderWidth: 1.5,
    alignItems: 'center',
  },
  optionText: { fontSize: 15, fontWeight: '600' },
});
