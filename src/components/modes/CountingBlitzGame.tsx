import React, { useState, useCallback, useRef, useEffect } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ModePowerUpBar } from '@/src/components/ModePowerUpBar';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import { sounds } from '@/src/lib/sounds';
import type { PowerUpId } from '@/src/utils/scoring';

function BlitzShape({ type, color, size }: { type: string; color: string; size: number }) {
  switch (type) {
    case 'circle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
    case 'square': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={20} height={20} rx={2} fill={color} /></Svg>;
    case 'triangle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,20 2,20" fill={color} /></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
  }
}

type Phase = 'chaos' | 'question' | 'feedback';

interface Props {
  modeData: any;
  /** See SnapMatchGame for the rationale. `correctRounds` lets the
   *  parent award stars based on correctness instead of raw points. */
  onComplete: (totalScore: number, correctRounds: number) => void;
  modeColor: string;
  /**
   * Multiplier applied to the chaos window. Solo = 1.0, challenge
   * passes `CHALLENGE_VIEW_TIME_MULT` (1.3) so the 5s-event-second
   * budget stretches to 6.5 real seconds in 1v1. The event
   * schedule (appearAt / duration) stays identical — we just slow
   * the progress clock so the player has more wall-time to count.
   */
  viewTimeMultiplier?: number;
  /** Keeps parent external round header in sync with internal state. */
  onRoundChange?: (roundIdx: number) => void;
}

export default function CountingBlitzGame({ modeData, onComplete, modeColor, viewTimeMultiplier = 1, onRoundChange }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('chaos');
  const [visibleShapes, setVisibleShapes] = useState<any[]>([]);
  const [chaosProgress, setChaosProgress] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const roundStartRef = useRef(0);

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  // ── Counting Blitz power-ups ──
  //  - cb_slow_motion: stretch the chaos window so shapes stay 50%
  //    longer. We do this by bumping the total duration from 5s → 7.5s
  //    and scaling each event's `appearAt` proportionally.
  //  - cb_colour_filter: brief "highlight pulse" on all currently
  //    visible shapes so the player can re-count for ~1s.
  const usePowerUpStore = useGameStore((s) => s.usePowerUp);
  const [usedPowerUps, setUsedPowerUps] = useState<Record<string, boolean>>({});
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [slowMotionActive, setSlowMotionActive] = useState(false);
  // Colour Filter redesigned: it now freezes the chaos for 2s so the
  // player can actually count what's on screen. The previous "brief
  // flash of the asked colour" idea never made sense because the
  // asked colour isn't shown to the player until AFTER chaos ends.
  // `pausedUntil` is an absolute timestamp — while Date.now() < that,
  // the interval skips its tick so elapsed time and visible shapes
  // both freeze. When the pause ends we shift roundStartRef forward
  // by the paused duration so the remaining window keeps its budget.
  const [colourFilterActive, setColourFilterActive] = useState(false);
  const pauseEndsAtRef = useRef(0);
  const colourFilterTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleUsePowerUp = useCallback((id: string) => {
    if (usedPowerUps[id]) return;
    // Live store read — selector-derived count lags one render after a
    // buy; otherwise BuyPowerUpPopup's auto-use would re-open the popup.
    if (useGameStore.getState().getPowerUpCount(id) <= 0) { setBuyPopupId(id as PowerUpId); return; }
    usePowerUpStore(id as PowerUpId);
    setUsedPowerUps(p => ({ ...p, [id]: true }));
    sounds.play('powerUp');
    if (id === 'cb_slow_motion') {
      setSlowMotionActive(true);
    } else if (id === 'cb_colour_filter') {
      // 2-second freeze starting NOW.
      pauseEndsAtRef.current = Date.now() + 2000;
      setColourFilterActive(true);
      if (colourFilterTimeoutRef.current) clearTimeout(colourFilterTimeoutRef.current);
      colourFilterTimeoutRef.current = setTimeout(() => setColourFilterActive(false), 2000);
    }
  }, [usedPowerUps, usePowerUpStore]);

  const handleBuyPopupBought = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    handleUsePowerUp(id);
  }, [handleUsePowerUp]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (colourFilterTimeoutRef.current) clearTimeout(colourFilterTimeoutRef.current);
    };
  }, []);

  const startChaos = useCallback(() => {
    if (!round) return;
    setPhase('chaos');
    setVisibleShapes([]);
    setSelectedOption(null);
    setChaosProgress(1);
    roundStartRef.current = Date.now();
    // Reset per-round power-up state
    setUsedPowerUps({});
    setSlowMotionActive(false);
    setColourFilterActive(false);
    pauseEndsAtRef.current = 0;

    // Accumulated paused-milliseconds across all Colour Filter uses
    // this round. Subtracting this from elapsed keeps the budget
    // honest — a 2s pause gives the player 2s of extra counting.
    let pausedMsTotal = 0;
    let wasPausedLastTick = false;
    let pauseTickStart = 0;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const isPaused = now < pauseEndsAtRef.current;

      // Track pause transitions so we can accumulate paused time on
      // resume. The elapsed reading rolls back by `pausedMsTotal`.
      if (isPaused && !wasPausedLastTick) {
        pauseTickStart = now;
        wasPausedLastTick = true;
      } else if (!isPaused && wasPausedLastTick) {
        pausedMsTotal += now - pauseTickStart;
        wasPausedLastTick = false;
      }

      if (isPaused) return; // Skip the tick entirely — visible shapes frozen.

      const elapsed = (now - roundStartRef.current - pausedMsTotal) / 1000;
      // Slow Motion stretches the chaos window 5s → 7.5s by applying a
      // time-scale factor to the elapsed reading. Each event's
      // appearAt/duration are still in original seconds; the scale
      // means 1 real second advances only 0.67 event-seconds.
      //
      // `viewTimeMultiplier` layers on top: in challenge mode (1.3)
      // the player gets 6.5 real seconds for the same 5-event-second
      // chaos. Combined with Slow Motion, they stack — 1v1 + slow
      // motion = ~9.75 real seconds.
      const slowMotionScale = slowMotionActive ? (1 / 1.5) : 1;
      const scale = slowMotionScale * (1 / viewTimeMultiplier);
      const scaledElapsed = elapsed * scale;
      const totalSec = 5; // event-time budget stays the same
      setChaosProgress(Math.max(0, 1 - scaledElapsed / totalSec));

      const nowVisible = round.events.filter((e: any) =>
        scaledElapsed >= e.appearAt && scaledElapsed < e.appearAt + e.duration
      );
      setVisibleShapes(nowVisible);

      if (scaledElapsed >= totalSec) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setVisibleShapes([]);
        sounds.play('whoosh');
        setPhase('question');
      }
    }, 50);
  }, [round, slowMotionActive]);

  useEffect(() => { if (round) startChaos(); }, [roundIdx, round]);
  useEffect(() => { onRoundChange?.(roundIdx); }, [roundIdx, onRoundChange]);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (phase !== 'question' || !round) return;
    setSelectedOption(optionIdx);
    const correct = optionIdx === round.correctIndex;
    const score = correct ? 100 : 0;
    setRoundScores(prev => [...prev, score]);
    setPhase('feedback');
    sounds.play(correct ? 'correct' : 'wrong');

    timerRef.current = setTimeout(() => {
      if (roundIdx + 1 < totalRounds) {
        setRoundIdx(prev => prev + 1);
      } else {
        const finalScores = [...roundScores, score];
        // Round score is 100 for the right count, 0 for the wrong
        // count, so 100s tally the correct rounds.
        const correctRounds = finalScores.filter((s) => s >= 100).length;
        onComplete(finalScores.reduce((a, b) => a + b, 0), correctRounds);
      }
    }, 1500);
  }, [phase, round, roundIdx, totalRounds, roundScores, onComplete]);

  if (!round) return null;

  const timerColor = chaosProgress > 0.4 ? modeColor : chaosProgress > 0.15 ? '#D4A012' : '#FF6B6B';

  return (
    <View style={s.container}>
      {phase === 'chaos' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>{t('modes.count_colours')}</Text>
          <View style={s.timerRow}>
            <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
              <View style={[s.timerFill, { width: `${Math.round(chaosProgress * 100)}%`, backgroundColor: timerColor }]} />
            </View>
            <Text style={[s.timerText, { color: colors.textMid }]}>{Math.max(0, chaosProgress * 5).toFixed(1)}s</Text>
          </View>
          <View style={[s.canvas, { backgroundColor: colors.card }]}>
            {visibleShapes.map((sh: any) => {
              const elapsed = (Date.now() - roundStartRef.current) / 1000;
              const shapeElapsed = elapsed - sh.appearAt;
              let opacity = 1;
              let scale = 1;
              if (shapeElapsed < 0.15) {
                opacity = shapeElapsed / 0.15;
                scale = 0.5 + opacity * 0.5;
              } else if (shapeElapsed > sh.duration - 0.2) {
                const exitProgress = (shapeElapsed - (sh.duration - 0.2)) / 0.2;
                opacity = Math.max(0, 1 - exitProgress);
                scale = 1 - exitProgress * 0.5;
              }

              return (
                <View
                  key={sh.id}
                  style={{
                    position: 'absolute',
                    left: `${sh.x}%`,
                    top: `${sh.y}%`,
                    transform: [{ translateX: -sh.size / 2 }, { translateY: -sh.size / 2 }, { scale }],
                    opacity,
                  }}
                >
                  <BlitzShape type={sh.shapeType} color={sh.color} size={sh.size} />
                </View>
              );
            })}
            {/* Colour Filter PAUSED overlay — all currently-visible
                shapes stay frozen on screen for 2s so the player can
                count them calmly. Semi-opaque white tint + "PAUSED"
                label makes the effect unmistakable. */}
            {colourFilterActive && (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(108,92,231,0.08)', alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderColor: '#6C5CE7' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#6C5CE7', letterSpacing: 1 }}>{t('game_indicators.paused_count_now')}</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {(phase === 'question' || phase === 'feedback') && (
        <View style={s.questionArea}>
          <View style={[s.askColorBox, { backgroundColor: round.askColor.hex }]}>
            <Text style={s.askColorText}>{round.askColor.name.toUpperCase()}</Text>
          </View>
          <Text style={[s.questionText, { color: colors.text }]}>
            How many <Text style={{ color: round.askColor.hex }}>{round.askColor.name}</Text> shapes appeared?
          </Text>
          <View style={s.optionsGrid}>
            {round.options.map((opt: number, i: number) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === round.correctIndex;
              const showResult = phase === 'feedback';

              let bg = colors.card;
              let textColor = colors.text;
              let borderColor = colors.border;
              let dimOpacity = 1;

              if (showResult) {
                if (isCorrect) {
                  bg = '#00B894';
                  textColor = '#FFF';
                  borderColor = '#00B894';
                } else if (isSelected && !isCorrect) {
                  bg = '#FF6B6B';
                  textColor = '#FFF';
                  borderColor = '#FF6B6B';
                } else {
                  dimOpacity = 0.3;
                }
              }

              return (
                <Pressable
                  key={i}
                  style={[s.optionBtn, { backgroundColor: bg, borderColor, borderWidth: 2, opacity: dimOpacity }]}
                  onPress={() => phase === 'question' && handleAnswer(i)}
                  disabled={phase !== 'question'}
                >
                  <Text style={[s.optionText, { color: textColor }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          {phase === 'feedback' && (
            <Text style={[s.feedbackText, { color: selectedOption === round.correctIndex ? colors.correct : colors.wrong }]}>
              {selectedOption === round.correctIndex ? 'Correct! +100 pts' : `Wrong! It was ${round.correctCount ?? '?'}`}
            </Text>
          )}
        </View>
      )}

      <View style={s.scoreRow}>
        {roundScores.map((sc, i) => (
          <View key={i} style={[s.scoreDot, { backgroundColor: sc > 0 ? colors.correct : colors.wrong }]}>
            <Text style={s.scoreDotText}>{sc > 0 ? '\u2713' : '\u2715'}</Text>
          </View>
        ))}
        {Array.from({ length: totalRounds - roundScores.length }).map((_, i) => (
          <View key={`e${i}`} style={[s.scoreDot, { backgroundColor: colors.border }]} />
        ))}
      </View>

      {/* Counting Blitz power-ups — during chaos only (the answer
          phase is a simple MCQ where power-ups don't apply). */}
      {phase === 'chaos' && (
        <ModePowerUpBar mode="counting_blitz" used={usedPowerUps} onUse={handleUsePowerUp} onBuyOut={(id) => setBuyPopupId(id as PowerUpId)} />
      )}

      <BuyPowerUpPopup powerUpId={buyPopupId} onClose={() => setBuyPopupId(null)} onBought={handleBuyPopupBought} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  phaseLabel: { fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 3 },
  timerText: { fontSize: 13, fontWeight: '700', width: 40 },
  canvas: { aspectRatio: 1, width: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden' },
  questionArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 16 },
  askColorBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  askColorText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  questionText: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 },
  optionBtn: { width: 80, height: 80, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 28, fontWeight: '800' },
  feedbackText: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  scoreDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
