import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { LevelCache } from '@/src/utils/levelCache';
import { log } from '@/src/lib/logger';
import { CAMPAIGNS } from '@/src/data/campaigns';
import { CHALLENGE_MODES, getScorePercentage, getMaxScore } from '@/src/data/challengeModes';
import { getPositionForLevelId } from '@/src/data/unifiedJourney';
import { generateSideCampaignData } from '@/src/utils/sideCampaignGenerators';
import { logActivity } from '@/src/utils/activity';
import SnapMatchGame from '@/src/components/modes/SnapMatchGame';
import SequenceGame from '@/src/components/modes/SequenceGame';
import CountingBlitzGame from '@/src/components/modes/CountingBlitzGame';
import ColourChainGame from '@/src/components/modes/ColourChainGame';
import ShapeSvg from '@/src/components/ShapeSvg';
import { StarRating } from '@/src/components/StarRating';
import ThreeStarBurst from '@/src/components/ThreeStarBurst';
import { ModePowerUpBar } from '@/src/components/ModePowerUpBar';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import { QuitConfirmModal } from '@/src/components/QuitConfirmModal';
import { sounds } from '@/src/lib/sounds';
import { applyPlusGemMultiplier, type PowerUpId } from '@/src/utils/scoring';

type Phase = 'loading' | 'ready' | 'show' | 'recall' | 'feedback' | 'round_done' | 'complete' | 'failed' | 'error';

/** Star award thresholds. Mirrors Classic mode (`requiredScore=60`,
 *  `TWO_STAR_THRESHOLD=80`, `parScore=100`) so a 4/5 in any mode reads
 *  as 2 stars consistently. The percentage passed in is the
 *  CORRECTNESS percentage (rounds answered correctly / total rounds),
 *  NOT the speed-weighted raw-score percentage. Speed-weighted points
 *  still drive the displayed "{x}%" score and gem rewards downstream;
 *  they just don't penalise stars any more. */
function getStarsForScore(correctnessPct: number): number {
  if (correctnessPct >= 100) return 3;
  if (correctnessPct >= 80) return 2;
  if (correctnessPct >= 60) return 1;
  return 0;
}

function SideCampaignScreen() {
  const { levelId, mode, worldNumber, levelNumber, worldName } = useLocalSearchParams<{
    levelId: string; mode: string; worldNumber: string; levelNumber: string; worldName: string;
  }>();
  // Prefer the unified position (1-380) for display. Falls back to the
  // per-world levelNumber if this levelId isn't registered in the
  // unified ladder (shouldn't happen post-migration but keeps legacy
  // entry points working).
  const displayLevel = getPositionForLevelId(levelId ?? '') ?? Number(levelNumber ?? 1);
  const router = useRouter();
  const { colors } = useTheme();
  const { addGems, loseLife, addStars } = useGameStore();
  const isSubscribed = useGameStore((s) => s.isSubscribed());

  const [phase, setPhase] = useState<Phase>('loading');
  const [modeData, setModeData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [scorePct, setScorePct] = useState(0);
  const [stars, setStarsState] = useState(0);
  const [gemsEarned, setGemsEarned] = useState(0);
  const [gemsDoubled, setGemsDoubled] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Speed recall inline state
  const [roundIdx, setRoundIdx] = useState(0);
  const [shapeIdx, setShapeIdx] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [shapeScores, setShapeScores] = useState<number[]>([]);
  const [tapResult, setTapResult] = useState<{ tapX: number; tapY: number; actualX: number; actualY: number; score: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });

  const modeConfig = CHALLENGE_MODES[mode ?? ''];
  const campaignConfig = CAMPAIGNS[mode ?? ''];
  const mColor = modeConfig?.color ?? campaignConfig?.color ?? '#6C5CE7';

  // Load level from cache first, then Supabase fallback
  useEffect(() => {
    if (!levelId) return;
    let cancelled = false;
    (async () => {
      try {
        // Try local cache first (works offline)
        const data = await LevelCache.getSideLevel(levelId);
        if (cancelled) return;
        if (!data) { setPhase('error'); return; }
        setLevelData(data.level_data);
        const generated = generateSideCampaignData(data.mode ?? mode ?? 'speed_recall', data.level_data);
        setModeData(generated);
        setPhase('ready');
      } catch { if (!cancelled) setPhase('error'); }
    })();
    return () => { cancelled = true; };
  }, [levelId]);

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); if (srIntervalRef.current) clearInterval(srIntervalRef.current); }; }, []);

  const isExternalMode = mode && ['snap_match', 'sequence', 'counting_blitz', 'colour_chain'].includes(mode);

  // ─── SPEED RECALL (inline) ───
  const currentRound = modeData?.rounds?.[roundIdx];
  const currentShape = currentRound?.shapes?.[shapeIdx];
  const viewingTimeBase = (modeData?.viewingTime ?? levelData?.viewingTime ?? 3) * 1000;

  // Speed recall timer progress for visual countdown
  const [srTimerProgress, setSrTimerProgress] = useState(1);
  const srIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── Speed Recall power-ups (side campaign — inline path) ──
  // Side-campaign handles speed_recall itself rather than delegating to
  // the SpeedRecallGame component, so the power-up wiring that lives
  // inside that component doesn't apply here. Rebuild it inline with
  // the same three effects: slow time, ghost outline, second chance.
  const usePowerUpStore = useGameStore((s) => s.usePowerUp);
  const powerUpCounts = useGameStore((s) => s.powerUps) ?? {};
  const [srUsedPowerUps, setSrUsedPowerUps] = useState<Record<string, boolean>>({});
  const [srBuyPopupId, setSrBuyPopupId] = useState<PowerUpId | null>(null);
  const [srSlowTimeBonus, setSrSlowTimeBonus] = useState(0); // ms added to viewingTime
  const [srGhostActive, setSrGhostActive] = useState(false);
  const [srSecondChanceArmed, setSrSecondChanceArmed] = useState(false);

  // Viewing time with slow-time bonus applied at round start.
  const viewingTime = viewingTimeBase + srSlowTimeBonus;

  const handleSrUsePowerUp = useCallback((id: string) => {
    if (srUsedPowerUps[id]) return;
    if ((powerUpCounts[id as PowerUpId] ?? 0) <= 0) { setSrBuyPopupId(id as PowerUpId); return; }
    usePowerUpStore(id as PowerUpId);
    setSrUsedPowerUps(p => ({ ...p, [id]: true }));
    sounds.play('powerUp');
    if (id === 'sr_slow_time') {
      // Add 2s to the CURRENT round's viewing window. If already in
      // `show` phase, re-arm the timer live.
      setSrSlowTimeBonus(2000);
    } else if (id === 'sr_ghost_outline') {
      setSrGhostActive(true);
    } else if (id === 'sr_second_chance') {
      setSrSecondChanceArmed(true);
    }
  }, [srUsedPowerUps, powerUpCounts, usePowerUpStore]);

  const handleSrBuyPopupBought = useCallback((id: PowerUpId) => {
    setSrBuyPopupId(null);
    handleSrUsePowerUp(id);
  }, [handleSrUsePowerUp]);

  const startRound = useCallback(() => {
    setShapeIdx(0);
    setShapeScores([]);
    setTapResult(null);
    setSrTimerProgress(1);
    // Reset per-round power-up state so each round gets fresh charges.
    setSrUsedPowerUps({});
    setSrSlowTimeBonus(0);
    setSrGhostActive(false);
    setSrSecondChanceArmed(false);
    setPhase('show');
    // Visual countdown — uses viewingTimeBase (not viewingTime) because
    // the slow-time bonus is reset above, so at round-start it's 0.
    const totalMs = viewingTimeBase;
    const start = Date.now();
    if (srIntervalRef.current) clearInterval(srIntervalRef.current);
    srIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setSrTimerProgress(Math.max(0, 1 - elapsed / totalMs));
      if (elapsed >= totalMs) { if (srIntervalRef.current) clearInterval(srIntervalRef.current); }
    }, 50);
    timerRef.current = setTimeout(() => {
      if (srIntervalRef.current) clearInterval(srIntervalRef.current);
      setSrTimerProgress(0);
      sounds.play('whoosh');
      setPhase('recall');
    }, totalMs);
  }, [viewingTimeBase]);

  // Slow Time — if tapped during `show`, extend the running timer by
  // srSlowTimeBonus ms. Re-arm the timeout + interval with the new
  // total so the countdown bar reflects the new deadline.
  useEffect(() => {
    if (srSlowTimeBonus <= 0 || phase !== 'show') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (srIntervalRef.current) clearInterval(srIntervalRef.current);
    const remainingMs = Math.max(0, srTimerProgress * viewingTimeBase) + srSlowTimeBonus;
    const totalMs = viewingTimeBase + srSlowTimeBonus;
    const startTime = Date.now() - (totalMs - remainingMs);
    srIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setSrTimerProgress(Math.max(0, 1 - elapsed / totalMs));
    }, 50);
    timerRef.current = setTimeout(() => {
      if (srIntervalRef.current) clearInterval(srIntervalRef.current);
      setSrTimerProgress(0);
      sounds.play('whoosh');
      setPhase('recall');
    }, remainingMs);
  // Only respond to bumps in the bonus; timer/phase changes shouldn't
  // re-trigger this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srSlowTimeBonus]);

  const handleCanvasTap = useCallback((e: any) => {
    if (phase !== 'recall' || !currentShape || tapResult) return;
    const nativeEvent = e.nativeEvent;
    const locationX = nativeEvent.locationX ?? nativeEvent.offsetX ?? 0;
    const locationY = nativeEvent.locationY ?? nativeEvent.offsetY ?? 0;
    const tapX = canvasSize.w > 0 ? (locationX / canvasSize.w) * 100 : 50;
    const tapY = canvasSize.h > 0 ? (locationY / canvasSize.h) * 100 : 50;
    const dist = Math.sqrt((tapX - currentShape.x) ** 2 + (tapY - currentShape.y) ** 2);
    const score = Math.max(0, Math.round(100 - dist * 2)) || 0;

    // Second Chance: tap more than 30% off the target consumes the
    // charge instead of locking in a bad score — player taps again.
    if (srSecondChanceArmed && dist > 30) {
      setSrSecondChanceArmed(false);
      sounds.play('powerUp');
      return;
    }

    setTapResult({ tapX, tapY, actualX: currentShape.x, actualY: currentShape.y, score });
    setShapeScores(prev => [...prev, score]);
    setPhase('feedback');
    // Audio feedback: correct/gold/wrong based on score bands.
    sounds.play(score >= 70 ? 'correct' : score >= 40 ? 'starPop' : 'wrong');

    timerRef.current = setTimeout(() => {
      setTapResult(null);
      if (shapeIdx + 1 < (currentRound?.shapes?.length ?? 0)) {
        setShapeIdx(prev => prev + 1);
        setPhase('recall');
      } else {
        // Score already added to shapeScores on line 127 — just calculate total from latest state
        setShapeScores(prev => {
          const roundTotal = prev.reduce((a, b) => a + b, 0);
          setRoundScores(rs => [...rs, roundTotal]);
          return prev;
        });
        setPhase('round_done');
      }
    }, 1200);
  }, [phase, currentShape, shapeIdx, currentRound, shapeScores, canvasSize, srSecondChanceArmed]);

  // ─── COMPLETION HANDLER (must be before nextRound which references it) ───
  // `correctRounds` is the count of rounds the player got right
  // regardless of speed (binary modes) or completed cleanly (partial-
  // credit modes). Stars are derived from this so a fast-but-wrong
  // run can't out-score a slow-but-correct one. `rawScore` still
  // drives the displayed "{x}%" pill so speed-based points stay
  // visible to the player.
  const finishLevel = useCallback(async (rawScore: number, correctRounds: number) => {
    // Calculate actual max score dynamically from modeData (not hardcoded getMaxScore)
    const totalRounds = modeData?.rounds?.length ?? 1;
    let maxScore: number;
    if (mode === 'speed_recall') {
      const shapesPerRound = modeData?.rounds?.[0]?.shapes?.length ?? 5;
      maxScore = totalRounds * shapesPerRound * 100;
    } else if (mode === 'sequence') {
      const seqLen = modeData?.rounds?.[0]?.shapes?.length ?? 5;
      maxScore = totalRounds * (seqLen * 20 + 50);
    } else if (mode === 'counting_blitz') {
      maxScore = totalRounds * 100;
    } else if (mode === 'colour_chain') {
      maxScore = totalRounds * 100;
    } else if (mode === 'snap_match') {
      maxScore = totalRounds * 100;
    } else {
      maxScore = 100; // fallback
    }
    const pct = Math.min(100, Math.round((rawScore / Math.max(1, maxScore)) * 100));
    // Stars come from correctness, NOT raw score. A 4/5 correct run
    // is 80% correctness regardless of how speedy each tap was.
    const correctnessPct = totalRounds > 0
      ? Math.round((correctRounds / totalRounds) * 100)
      : 0;
    const earnedStars = getStarsForScore(correctnessPct);
    setTotalScore(rawScore);
    setScorePct(pct);
    setStarsState(earnedStars);

    // Gem rewards — same as Classic: 1/2/3 gems for 1/2/3 stars
    // On replay, only earn the difference if improved.
    // Blanked+ subscribers get the 2× multiplier applied at the end so
    // both first-clear and improvement gems get doubled consistently.
    let baseGems = 0;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId && levelId && earnedStars > 0) {
        // Only save progress when player passes — failed attempts don't count
        const { data: existing } = await supabase
          .from('side_campaign_progress')
          .select('stars, best_score')
          .eq('user_id', userId)
          .eq('level_id', levelId)
          .single();

        const previousStars = existing?.stars ?? 0;
        if (earnedStars > previousStars) {
          baseGems = earnedStars - previousStars;
        } else if (previousStars === 0 && earnedStars > 0) {
          baseGems = earnedStars;
        }

        await supabase.from('side_campaign_progress').upsert({
          user_id: userId,
          level_id: levelId,
          stars: Math.max(earnedStars, previousStars),
          best_score: Math.max(pct, existing?.best_score ?? 0),
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,level_id' });
      }
    } catch (e) {
      log.error('side-campaign', 'save progress failed', e);
    }

    const isPlus = useGameStore.getState().subscriptionStatus === 'active';
    const { gems, doubled } = applyPlusGemMultiplier(baseGems, isPlus);
    setGemsEarned(gems);
    setGemsDoubled(doubled);
    if (gems > 0) addGems(gems);
    if (earnedStars > 0) addStars(earnedStars);
    // Advance the unified ladder if the player just cleared the level
    // at their current ladder position. Plays from the Mode Library or
    // replays at lower positions are no-ops (guard lives in the action).
    if (earnedStars > 0 && levelId) {
      useGameStore.getState().advanceUnifiedPosition(levelId);
    }

    // Pass / fail on stars rather than raw points so a 4/5 correct
    // run with slow taps (low raw %) doesn't get marked as a fail.
    if (earnedStars > 0) {
      setPhase('complete');
      // Log to recent activity feed so the home screen surfaces it
      const modeName = CHALLENGE_MODES[mode as keyof typeof CHALLENGE_MODES]?.name ?? mode;
      logActivity('mode_complete', { mode, modeName, score: rawScore, scorePct: pct, stars: earnedStars, levelId });
    } else {
      loseLife();
      setPhase('failed');
    }
  }, [mode, levelId, addGems, addStars, loseLife, modeData, isExternalMode]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < (modeData?.rounds?.length ?? 0)) {
      setRoundIdx(prev => prev + 1);
      startRound();
    } else {
      setRoundScores(prev => {
        const total = prev.reduce((a, b) => a + b, 0);
        // This branch is only used by the inline Speed Recall flow
        // (not the embedded Game components), where each round score
        // is the per-round raw points. Treat a round as "correct"
        // when it cleared 60% of the per-round max, matching the
        // SpeedRecallGame component's threshold so star awards stay
        // consistent across both code paths.
        const shapesPerRound = modeData?.rounds?.[0]?.shapes?.length ?? 5;
        const perRoundMax = shapesPerRound * 100;
        const threshold = Math.round(perRoundMax * 0.6);
        const correctRounds = prev.filter((s) => s >= threshold).length;
        finishLevel(total, correctRounds);
        return prev;
      });
    }
  }, [roundIdx, modeData, startRound, finishLevel]);

  const handleModeComplete = useCallback((rawScore: number, correctRounds: number) => {
    finishLevel(rawScore, correctRounds);
  }, [finishLevel]);

  // ─── Navigate to next level ───
  const goToNextLevel = useCallback(() => {
    // Reset ALL state before navigating — router.replace reuses the component
    setPhase('loading');
    setTotalScore(0);
    setScorePct(0);
    setStarsState(0);
    setGemsEarned(0);
    setModeData(null);
    setLevelData(null);
    setRoundIdx(0);
    setShapeIdx(0);
    setRoundScores([]);
    setShapeScores([]);
    setTapResult(null);
    setShowQuitConfirm(false);

    const wNum = parseInt(worldNumber ?? '1');
    const lNum = parseInt(levelNumber ?? '1');
    const nextLevelNum = lNum + 1;
    const prefix = mode === 'speed_recall' ? 'sr' : mode === 'snap_match' ? 'sm' : mode === 'sequence' ? 'seq' : mode === 'counting_blitz' ? 'cb' : 'cc';
    const nextId = `${prefix}_w${wNum}_l${nextLevelNum}`;
    router.replace({
      pathname: '/game/side-campaign',
      params: { levelId: nextId, mode: mode ?? '', worldNumber: worldNumber ?? '1', levelNumber: String(nextLevelNum), worldName: worldName ?? '' },
    });
  }, [mode, worldNumber, levelNumber, worldName, router]);

  // ─── RENDER ───
  if (phase === 'loading') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
          <View style={{ width: 120, height: 16, borderRadius: 8, backgroundColor: colors.surface }} />
          <View style={{ width: 200, height: 200, borderRadius: 20, backgroundColor: colors.surface }} />
          <View style={{ width: 160, height: 12, borderRadius: 6, backgroundColor: colors.surface }} />
          <View style={{ width: '80%', height: 48, borderRadius: 14, backgroundColor: colors.surface }} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <Text style={[s.loadingText, { color: colors.wrong }]}>{t('challenge.could_not_load_level')}</Text>
        <Pressable style={[s.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={s.btnText}>{t('challenge.go_back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => {
          const inGame = phase === 'show' || phase === 'recall' || phase === 'feedback' || phase === 'round_done';
          if (inGame) setShowQuitConfirm(true);
          else router.back();
        }} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.closeX, { color: colors.textMid }]}>{'\u2715'}</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: mColor }]}>{worldName}</Text>
          <Text style={[s.headerSub, { color: colors.textMid }]}>Level {displayLevel}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Ready */}
      {phase === 'ready' && (
        <View style={s.centered}>
          <View style={[s.modeBadge, { backgroundColor: mColor + '15' }]}>
            <Text style={[s.modeBadgeText, { color: mColor }]}>{modeConfig?.name ?? mode}</Text>
          </View>
          <Text style={[s.bigTitle, { color: colors.text }]}>Level {displayLevel}</Text>
          <Text style={[s.subtitle, { color: colors.textMid }]}>{worldName}</Text>
          <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => {
            if (isExternalMode) setPhase('show');
            else startRound();
          }}>
            <Text style={s.btnText}>{t('game.start')}</Text>
          </Pressable>
        </View>
      )}

      {/* External mode games */}
      {phase === 'show' && isExternalMode && modeData && (
        <>
          {mode === 'snap_match' && <SnapMatchGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} onRoundChange={setRoundIdx} />}
          {mode === 'sequence' && <SequenceGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} onRoundChange={setRoundIdx} />}
          {mode === 'counting_blitz' && <CountingBlitzGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} onRoundChange={setRoundIdx} />}
          {mode === 'colour_chain' && <ColourChainGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} onRoundChange={setRoundIdx} />}
        </>
      )}

      {/* SPEED RECALL: Show scene */}
      {phase === 'show' && !isExternalMode && currentRound && (
        <View style={s.gameArea}>
          <Text style={[s.phaseLabel, { color: colors.textMid }]}>{t('challenge.memorise_positions')}</Text>
          {/* Timer bar */}
          <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border, marginBottom: 10, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(srTimerProgress * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: srTimerProgress > 0.4 ? mColor : srTimerProgress > 0.15 ? '#D4A012' : '#FF6B6B' }} />
          </View>
          <View style={[s.canvas, { backgroundColor: colors.card }]} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {currentRound.shapes.map((sh: any, i: number) => (
              <View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sh.size / 2 }, { translateY: -sh.size / 2 }] }}>
                <ShapeSvg type={sh.type} color={sh.color} size={sh.size} />
              </View>
            ))}
          </View>
          {/* Power-up bar during memorise phase — slow_time is the one
              that's usually useful here; ghost_outline / second_chance
              can also be primed before flipping to recall. */}
          <ModePowerUpBar mode="speed_recall" used={srUsedPowerUps} onUse={handleSrUsePowerUp} onBuyOut={(id) => setSrBuyPopupId(id as PowerUpId)} />
        </View>
      )}

      {/* SPEED RECALL: Recall / Feedback */}
      {(phase === 'recall' || phase === 'feedback') && !isExternalMode && currentShape && (
        <View style={s.gameArea}>
          <View style={s.promptRow}>
            <ShapeSvg type={currentShape.type} color={currentShape.color} size={24} />
            <Text style={[s.promptText, { color: colors.text }]}>{t('game_indicators.where_was_color_shape', { color: currentShape.colorName, shape: currentShape.type })}</Text>
          </View>
          <Text style={[s.shapeProgress, { color: colors.textLight }]}>{t('game_indicators.shape_progress', { index: shapeIdx + 1, total: currentRound.shapes.length })}</Text>
          {phase === 'recall' && srSecondChanceArmed && (
            <Text style={[s.shapeProgress, { color: '#E17055', fontWeight: '700' }]}>{t('challenge.second_chance_armed')}</Text>
          )}
          <Pressable style={[s.canvas, { backgroundColor: colors.card }]} onPress={handleCanvasTap} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {/* Ghost Outline — dashed rings at every shape's true
                position during recall. One-shot per round. */}
            {phase === 'recall' && srGhostActive && currentRound.shapes.map((sh: any, i: number) => (
              <View
                key={`ghost-${i}`}
                style={{
                  position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`,
                  width: 40, height: 40, borderRadius: 20,
                  borderWidth: 1.5, borderColor: sh.color,
                  borderStyle: 'dashed', opacity: 0.3,
                  transform: [{ translateX: -20 }, { translateY: -20 }],
                }}
                pointerEvents="none"
              />
            ))}
            {tapResult && (
              <>
                {/* Player's tap marker */}
                <View style={{ position: 'absolute', left: `${tapResult.tapX}%`, top: `${tapResult.tapY}%`, width: 18, height: 18, borderRadius: 9, backgroundColor: currentShape.color, opacity: 0.6, transform: [{ translateX: -9 }, { translateY: -9 }] }} />
                {/* Actual shape position — show the real shape */}
                <View style={{ position: 'absolute', left: `${tapResult.actualX}%`, top: `${tapResult.actualY}%`, transform: [{ translateX: -(currentShape.size ?? 42) / 2 }, { translateY: -(currentShape.size ?? 42) / 2 }], opacity: 0.4 }}>
                  <ShapeSvg type={currentShape.type} color={currentShape.color} size={currentShape.size ?? 42} />
                </View>
                {/* Dashed circle around actual position */}
                <View style={{ position: 'absolute', left: `${tapResult.actualX}%`, top: `${tapResult.actualY}%`, width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: colors.correct, borderStyle: 'dashed', transform: [{ translateX: -24 }, { translateY: -24 }] }} />
                {/* Score label */}
                <View style={{ position: 'absolute', left: `${Math.min(85, Math.max(15, tapResult.actualX))}%`, top: `${Math.max(12, tapResult.actualY - 8)}%`, transform: [{ translateX: -24 }, { translateY: -32 }] }}>
                  <Text style={[s.feedbackScore, { color: tapResult.score >= 70 ? colors.correct : tapResult.score >= 40 ? colors.gold : colors.wrong }]}>{t('game_indicators.points_suffix', { count: tapResult.score })}</Text>
                </View>
              </>
            )}
          </Pressable>
          {/* Power-up bar during recall so ghost_outline / second_chance
              can still be activated after the shapes disappear. */}
          {phase === 'recall' && (
            <ModePowerUpBar mode="speed_recall" used={srUsedPowerUps} onUse={handleSrUsePowerUp} onBuyOut={(id) => setSrBuyPopupId(id as PowerUpId)} />
          )}
        </View>
      )}

      {/* Round done (speed recall only) */}
      {phase === 'round_done' && !isExternalMode && (
        <View style={s.centered}>
          <Text style={[s.roundDoneTitle, { color: mColor }]}>Round {roundIdx + 1} Complete!</Text>
          <Text style={[s.roundDoneScore, { color: colors.text }]}>{roundScores[roundScores.length - 1] ?? 0}/{(currentRound?.shapes?.length ?? 5) * 100}</Text>
          <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={nextRound}>
            <Text style={s.btnText}>{roundIdx + 1 < (modeData?.rounds?.length ?? 5) ? 'Next Round' : 'See Results'}</Text>
          </Pressable>
        </View>
      )}

      {/* Level Complete */}
      {phase === 'complete' && (
        <View style={s.centered}>
          <Text style={[s.bigTitle, { color: mColor }]}>{t('challenge.level_complete')}</Text>
          <Text style={[s.bigScore, { color: colors.text }]}>{scorePct}%</Text>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <StarRating stars={Math.max(0, Math.min(3, stars)) as 0 | 1 | 2 | 3} size={44} animate />
            <ThreeStarBurst trigger={true} stars={stars} />
          </View>
          {gemsEarned > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[s.gemsText, { color: colors.gold }]}>+{gemsEarned} gems</Text>
              {gemsDoubled && (
                <View style={{ backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>{t('result.plus_doubled_badge')}</Text>
                </View>
              )}
            </View>
          )}
          <View style={s.buttonRow}>
            <Pressable style={[s.btn, s.btnSecondary, { borderColor: mColor }]} onPress={() => router.replace('/(tabs)/journey')}>
              <Text style={[s.btnTextSecondary, { color: mColor }]}>{t('challenge.back_to_map')}</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={goToNextLevel}>
              <Text style={s.btnText}>{t('challenge.next_level')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Level Failed */}
      {phase === 'failed' && (
        <View style={s.centered}>
          <Text style={[s.bigTitle, { color: colors.wrong }]}>{t('challenge.not_quite')}</Text>
          <Text style={[s.bigScore, { color: colors.text }]}>{scorePct}%</Text>
          <Text style={[s.subtitle, { color: colors.textMid }]}>{t('game_indicators.you_need_pass')}</Text>
          <View style={s.buttonRow}>
            <Pressable style={[s.btn, s.btnSecondary, { borderColor: colors.textMid }]} onPress={() => router.replace('/(tabs)/journey')}>
              <Text style={[s.btnTextSecondary, { color: colors.textMid }]}>{t('challenge.back_to_map')}</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => {
              // Retry — regenerate data and fully reset state
              if (levelData && mode) {
                const regenerated = generateSideCampaignData(mode, levelData);
                setModeData(regenerated);
                setTotalScore(0);
                setScorePct(0);
                setStarsState(0);
                setGemsEarned(0);
                setRoundIdx(0);
                setShapeIdx(0);
                setRoundScores([]);
                setShapeScores([]);
                setTapResult(null);
                setPhase('ready');
              }
            }}>
              <Text style={s.btnText}>{t('challenge.try_again')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Quit confirmation modal */}
      {showQuitConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowQuitConfirm(false)}>
          <View style={s.quitBackdrop}>
            <Pressable style={s.quitBackdropTouch} onPress={() => setShowQuitConfirm(false)} />
            <View style={[s.quitCard, { backgroundColor: colors.card }]}>
              <Text style={[s.quitTitle, { color: colors.text }]}>{t('challenge.leave_level')}</Text>
              <Text style={[s.quitMessage, { color: colors.textMid }]}>
                {isSubscribed ? 'Are you sure you want to leave?' : "You'll lose a life if you quit now."}
              </Text>
              <Pressable style={[s.btn, { backgroundColor: colors.wrong }]} onPress={() => { setShowQuitConfirm(false); if (!isSubscribed) loseLife(); router.back(); }}>
                <Text style={s.btnText}>{isSubscribed ? 'Leave' : 'Leave (-1 life)'}</Text>
              </Pressable>
              <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => setShowQuitConfirm(false)}>
                <Text style={s.btnText}>{t('challenge.keep_playing')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Speed recall buy-popup (shared by all SR power-ups) */}
      <BuyPowerUpPopup powerUpId={srBuyPopupId} onClose={() => setSrBuyPopupId(null)} onBought={handleSrBuyPopupBought} />
    </SafeAreaView>
  );
}

export default SideCampaignScreen;

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  closeBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 20 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  gameArea: { flex: 1, gap: 10 },
  modeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  modeBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  bigTitle: { fontSize: 28, fontWeight: '800' },
  bigScore: { fontSize: 56, fontWeight: '900' },
  subtitle: { fontSize: 15 },
  btn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', minWidth: 140 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2 },
  btnTextSecondary: { fontSize: 17, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  loadingText: { fontSize: 15, textAlign: 'center', marginTop: 20 },
  phaseLabel: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  canvas: { aspectRatio: 1, width: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  promptText: { fontSize: 15, fontWeight: '600' },
  shapeProgress: { fontSize: 12, textAlign: 'center' },
  feedbackScore: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  roundDoneTitle: { fontSize: 22, fontWeight: '700' },
  roundDoneScore: { fontSize: 42, fontWeight: '900' },
  gemsText: { fontSize: 18, fontWeight: '700' },
  quitBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  quitBackdropTouch: { ...StyleSheet.absoluteFillObject },
  quitCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  quitTitle: { fontSize: 20, fontWeight: '700' },
  quitMessage: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
});
