import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ModePowerUpBar } from '@/src/components/ModePowerUpBar';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import { sounds } from '@/src/lib/sounds';
import type { PowerUpId } from '@/src/utils/scoring';

function ShapeSvg({ type, color, size }: { type: string; color: string; size: number }) {
  switch (type) {
    case 'circle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
    case 'square': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={20} height={20} rx={3} fill={color} /></Svg>;
    case 'triangle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,20 2,20" fill={color} /></Svg>;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,12 12,22 2,12" fill={color} /></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
  }
}

type Phase = 'sceneA' | 'blank' | 'sceneB' | 'feedback';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
  /**
   * Multiplier applied to Scene A viewing time. Solo defaults to
   * `1.0`; challenge mode passes `CHALLENGE_VIEW_TIME_MULT` (1.3)
   * so rounds 3-5 (originally only 1500ms) get a humane buffer
   * in the competitive context. See
   * `src/utils/challengeTiming.ts`.
   */
  viewTimeMultiplier?: number;
}

export default function SnapMatchGame({ modeData, onComplete, modeColor, viewTimeMultiplier = 1 }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('sceneA');
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [responseStartTime, setResponseStartTime] = useState(0);
  const [responseTimer, setResponseTimer] = useState(0);
  const [timerProgress, setTimerProgress] = useState(1); // 1 = full, 0 = empty
  const [lastResult, setLastResult] = useState<{ correct: boolean; score: number; description: string; time: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });
  const canvasRef = useRef<View>(null);
  const canvasPos = useRef({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  // ── Snap Match power-ups ──
  const usePowerUpStore = useGameStore((s) => s.usePowerUp);
  const powerUpCounts = useGameStore((s) => s.powerUps) ?? {};
  const [usedPowerUps, setUsedPowerUps] = useState<Record<string, boolean>>({});
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [slowFlashBonus, setSlowFlashBonus] = useState(0); // +ms to sceneA
  const [highlightActive, setHighlightActive] = useState(false); // shimmer on change
  // Freeze bonus is a ref so the scheduled sceneA -> blank transition
  // picks up the current value when the timer fires, instead of the
  // zero it was captured as at round start. Without the ref, tapping
  // Freeze during sceneA did nothing because the inner setTimeout
  // already held `800 + 0`.
  const freezeBonusRef = useRef(0);
  const [freezeActive, setFreezeActive] = useState(false); // UI flag for the "Frozen" label

  // Base viewing time per round + slow-flash bonus (only for this round).
  // Apply challenge multiplier to the BASE window only — slow-flash is
  // a flat power-up bonus that should feel the same regardless of
  // context (you paid for exactly 1500ms extra).
  const baseViewingMs = Math.round((roundIdx < 2 ? 2500 : roundIdx < 4 ? 2000 : 1500) * viewTimeMultiplier);
  const viewingTimeMs = baseViewingMs + slowFlashBonus;

  const handleUsePowerUp = useCallback((id: string) => {
    if (usedPowerUps[id]) return;
    if ((powerUpCounts[id] ?? 0) <= 0) { setBuyPopupId(id as PowerUpId); return; }
    usePowerUpStore(id as PowerUpId);
    setUsedPowerUps(p => ({ ...p, [id]: true }));
    sounds.play('powerUp');
    if (id === 'sm_slow_flash') setSlowFlashBonus(1500);
    else if (id === 'sm_highlight') setHighlightActive(true);
    else if (id === 'sm_freeze') {
      freezeBonusRef.current = 3000;
      setFreezeActive(true);
    }
  }, [usedPowerUps, powerUpCounts, usePowerUpStore]);

  const handleBuyPopupBought = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    handleUsePowerUp(id);
  }, [handleUsePowerUp]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Start round — show Scene A with countdown timer.
  // Reset per-round power-ups so each round gets its own charges.
  const startRound = useCallback(() => {
    setLastResult(null);
    setPhase('sceneA');
    setTimerProgress(1);
    setResponseTimer(0);
    setUsedPowerUps({});
    setSlowFlashBonus(0);
    setHighlightActive(false);
    freezeBonusRef.current = 0;
    setFreezeActive(false);

    const startTime = Date.now();

    // Animate timer bar
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / viewingTimeMs);
      setTimerProgress(remaining);
    }, 50);

    // Transition: sceneA -> blank -> sceneB. Freeze power-up extends
    // the blank window so the player gets breathing room.
    // Read freezeBonusRef at the time the timeout fires (not capture
    // at round start), so activating Freeze during sceneA actually
    // lengthens the upcoming blank phase.
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerProgress(0);
      sounds.play('whoosh');
      setPhase('blank');
      const blankMs = 800 + freezeBonusRef.current;
      const inner = setTimeout(() => {
        setPhase('sceneB');
        setResponseStartTime(Date.now());
      }, blankMs);
      timerRef.current = inner;
    }, viewingTimeMs);
  // viewingTimeMs / freezeBonus captured by design — we don't want
  // mid-round changes to re-fire this. slow_flash extension happens in
  // a separate effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slow Flash: if tapped during sceneA, extend the current timer by
  // the bonus amount. Re-arm timer + interval with the new total.
  useEffect(() => {
    if (slowFlashBonus <= 0 || phase !== 'sceneA') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const remainingMs = Math.max(0, timerProgress * viewingTimeMs) + slowFlashBonus;
    const totalMs = viewingTimeMs;
    const startTime = Date.now() - (totalMs - remainingMs);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimerProgress(Math.max(0, 1 - elapsed / totalMs));
    }, 50);
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerProgress(0);
      setPhase('blank');
      const blankMs = 800 + freezeBonusRef.current;
      const inner = setTimeout(() => {
        setPhase('sceneB');
        setResponseStartTime(Date.now());
      }, blankMs);
      timerRef.current = inner;
    }, remainingMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowFlashBonus]);

  // Auto-start each round
  useEffect(() => { if (round) startRound(); }, [roundIdx, round]);

  // Response timer (counts up during Scene B)
  useEffect(() => {
    if (phase !== 'sceneB') return;
    intervalRef.current = setInterval(() => {
      setResponseTimer(Date.now() - responseStartTime);
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, responseStartTime]);

  const handleTapSceneB = useCallback((tapX: number, tapY: number) => {
    if (phase !== 'sceneB' || !round) return;
    if (canvasSize.w === 0 || canvasSize.h === 0) return; // Don't process taps before layout
    if (intervalRef.current) clearInterval(intervalRef.current);

    const elapsed = Date.now() - responseStartTime;
    const { changeType, targetIndex, sceneB, removedShape, description } = round;
    let correct = false;

    // Use generous hit radius — vary by change type
    const hitRadius = changeType === 'removed' ? 22 : changeType === 'position' ? 24 : 20;

    if (changeType === 'removed' && removedShape) {
      const dist = Math.sqrt((tapX - removedShape.x) ** 2 + (tapY - removedShape.y) ** 2);
      correct = dist < hitRadius;
    } else {
      const target = sceneB[targetIndex];
      if (target) {
        const dist = Math.sqrt((tapX - target.x) ** 2 + (tapY - target.y) ** 2);
        correct = dist < hitRadius;
      }
    }

    const score = correct ? Math.max(10, Math.round(100 - (elapsed / 1000) * 10)) : 0;
    setLastResult({ correct, score, description, time: elapsed });
    setRoundScores(prev => [...prev, score]);
    setPhase('feedback');
    sounds.play(correct ? 'correct' : 'wrong');

    timerRef.current = setTimeout(() => {
      if (roundIdx + 1 < totalRounds) {
        setRoundIdx(prev => prev + 1);
      } else {
        const total = [...roundScores, score].reduce((a, b) => a + b, 0);
        onComplete(total);
      }
    }, 1500);
  }, [phase, round, responseStartTime, roundIdx, totalRounds, roundScores, onComplete]);

  const handleCanvasPress = useCallback((e: any) => {
    const nativeEvent = e.nativeEvent;
    let lx: number, ly: number;

    // Prefer pageX/pageY minus canvas position (most accurate)
    const px = nativeEvent.pageX ?? nativeEvent.clientX;
    const py = nativeEvent.pageY ?? nativeEvent.clientY;
    if (px != null && py != null && canvasPos.current.x > 0) {
      lx = px - canvasPos.current.x;
      ly = py - canvasPos.current.y;
    } else {
      // Fallback: offsetX/locationX (works when tapping the canvas directly, not child shapes)
      lx = nativeEvent.locationX ?? nativeEvent.offsetX ?? 0;
      ly = nativeEvent.locationY ?? nativeEvent.offsetY ?? 0;
    }

    const tapX = canvasSize.w > 0 ? (lx / canvasSize.w) * 100 : 50;
    const tapY = canvasSize.h > 0 ? (ly / canvasSize.h) * 100 : 50;
    handleTapSceneB(tapX, tapY);
  }, [handleTapSceneB, canvasSize]);

  const renderScene = (shapes: any[], highlightIdx?: number, highlightColor?: string) => (
    <>
      {shapes.map((sh: any, i: number) => {
        const isHighlighted = highlightIdx === i;
        const sz = sh.size ?? 30;
        return (
          <View key={`${sh.id ?? i}-${sh.x}-${sh.y}`} style={[
            { position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }] },
            isHighlighted && { borderWidth: 3, borderColor: highlightColor ?? colors.correct, borderRadius: sz / 2 + 4, padding: 2 },
          ]}>
            <ShapeSvg type={sh.type} color={sh.color} size={sz} />
          </View>
        );
      })}
    </>
  );

  if (!round) return null;

  const responseSeconds = (responseTimer / 1000).toFixed(1);

  return (
    <View style={s.container}>
      {/* Phase label */}
      {phase === 'sceneA' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>SCENE A — Memorise!</Text>
          {/* Countdown timer bar */}
          <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
            <View style={[s.timerFill, {
              width: `${Math.round(timerProgress * 100)}%`,
              backgroundColor: timerProgress > 0.4 ? modeColor : timerProgress > 0.15 ? colors.gold : colors.wrong,
            }]} />
          </View>
        </>
      )}
      {phase === 'blank' && (
        <Text style={[s.phaseLabel, { color: freezeActive ? '#00CEC9' : colors.textMid }]}>
          {freezeActive ? '\u2744 Frozen...' : 'Get ready...'}
        </Text>
      )}
      {phase === 'sceneB' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>SCENE B — Tap what changed!</Text>
          <Text style={[s.responseTime, { color: colors.textMid }]}>{responseSeconds}s</Text>
          {round.changeType === 'removed' && (
            <Text style={[s.hint, { color: colors.gold }]}>Something is missing... tap where it was</Text>
          )}
        </>
      )}
      {phase === 'feedback' && lastResult && (
        <>
          <Text style={[s.phaseLabel, { color: lastResult.correct ? colors.correct : colors.wrong }]}>
            {lastResult.correct ? `Correct! +${lastResult.score} pts` : 'Wrong!'}
          </Text>
          {lastResult.correct && (
            <Text style={[s.responseTime, { color: colors.correct }]}>{(lastResult.time / 1000).toFixed(1)}s</Text>
          )}
        </>
      )}

      {/* Canvas */}
      <Pressable
        ref={canvasRef as any}
        style={[s.canvas, { backgroundColor: colors.card }]}
        onPress={phase === 'sceneB' ? handleCanvasPress : undefined}
        onLayout={(e) => {
          const { width, height, x, y } = e.nativeEvent.layout;
          setCanvasSize({ w: width, h: height });
          // Try measureInWindow for accurate screen-relative position
          try {
            (canvasRef.current as any)?.measureInWindow?.((mx: number, my: number) => {
              if (mx !== undefined && my !== undefined) canvasPos.current = { x: mx, y: my };
            });
          } catch {
            // Fallback: use layout position (may be relative to parent)
            canvasPos.current = { x, y };
          }
        }}
      >
        {phase === 'sceneA' && renderScene(round.sceneA)}
        {phase === 'sceneB' && (highlightActive
          // Highlight power-up: draw a subtle accent border around the
          // changed shape so the player can find it faster.
          ? renderScene(round.sceneB, round.targetIndex, modeColor)
          : renderScene(round.sceneB)
        )}
        {phase === 'feedback' && lastResult && (
          lastResult.correct
            ? renderScene(round.sceneB, round.targetIndex, colors.correct)
            : renderScene(round.sceneB, round.targetIndex >= 0 ? round.targetIndex : undefined, '#D4A012')
        )}
        {phase === 'blank' && (
          <View style={s.blankOverlay}>
            <Text style={[s.blankText, { color: colors.textLight }]}>...</Text>
          </View>
        )}
      </Pressable>

      {/* Feedback description */}
      {phase === 'feedback' && lastResult && (
        <Text style={[s.description, { color: colors.textMid }]}>{round.description}</Text>
      )}

      {/* Running score tally */}
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

      {/* Snap Match power-ups — visible during viewing + response. */}
      {(phase === 'sceneA' || phase === 'sceneB' || phase === 'blank') && (
        <ModePowerUpBar mode="snap_match" used={usedPowerUps} onUse={handleUsePowerUp} onBuyOut={(id) => setBuyPopupId(id as PowerUpId)} />
      )}

      <BuyPowerUpPopup powerUpId={buyPopupId} onClose={() => setBuyPopupId(null)} onBought={handleBuyPopupBought} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  timerTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginHorizontal: 4 },
  timerFill: { height: '100%', borderRadius: 3 },
  responseTime: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  canvas: { aspectRatio: 1, width: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  blankOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blankText: { fontSize: 28 },
  description: { fontSize: 13, textAlign: 'center', fontWeight: '600' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  scoreDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
