import React, { useState, useCallback, useRef, useEffect } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';
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

type Phase = 'showing' | 'pause' | 'recall' | 'wrong' | 'round_done';

interface Props {
  modeData: any;
  /** See SnapMatchGame for the rationale. `correctRounds` counts only
   *  the rounds the player completed in full; partial sequences (got
   *  some right then made a wrong tap) don't qualify, matching the
   *  Classic-mode "did you get the answer right" semantics. */
  onComplete: (totalScore: number, correctRounds: number) => void;
  modeColor: string;
  /** Keeps parent external round header in sync with internal state. */
  onRoundChange?: (roundIdx: number) => void;
}

export default function SequenceGame({ modeData, onComplete, modeColor, onRoundChange }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('showing');
  const [showingIdx, setShowingIdx] = useState(-1);
  const [tappedOrder, setTappedOrder] = useState<number[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [correctNextIdx, setCorrectNextIdx] = useState<number | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;
  const shapes = round?.shapes ?? [];

  // ── Sequence power-ups ──
  //  - seq_replay_one: briefly flash the last shape in the sequence
  //    again so the player can verify they remembered it correctly.
  //  - seq_safety_net: first wrong tap doesn't end the round; it's
  //    just ignored and the expected shape is still waiting.
  const usePowerUpStore = useGameStore((s) => s.usePowerUp);
  const powerUpCounts = useGameStore((s) => s.powerUps) ?? {};
  const [usedPowerUps, setUsedPowerUps] = useState<Record<string, boolean>>({});
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [replayShapeIdx, setReplayShapeIdx] = useState<number | null>(null);
  const [safetyNetArmed, setSafetyNetArmed] = useState(false);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const handleUsePowerUp = useCallback((id: string) => {
    if (usedPowerUps[id]) return;
    if ((powerUpCounts[id] ?? 0) <= 0) { setBuyPopupId(id as PowerUpId); return; }
    usePowerUpStore(id as PowerUpId);
    setUsedPowerUps(p => ({ ...p, [id]: true }));
    sounds.play('powerUp');
    if (id === 'seq_replay_one') {
      // Flash the LAST shape in the original sequence for 900ms.
      const lastIdx = shapes.findIndex((s: any) => s.order === shapes.length);
      if (lastIdx >= 0) {
        setReplayShapeIdx(lastIdx);
        setTimeout(() => { if (mountedRef.current) setReplayShapeIdx(null); }, 900);
      }
    } else if (id === 'seq_safety_net') {
      setSafetyNetArmed(true);
    }
  }, [usedPowerUps, powerUpCounts, usePowerUpStore, shapes]);

  const handleBuyPopupBought = useCallback((id: PowerUpId) => {
    setBuyPopupId(null);
    handleUsePowerUp(id);
  }, [handleUsePowerUp]);

  const startShowing = useCallback(() => {
    setPhase('showing');
    setShowingIdx(-1);
    setTappedOrder([]);
    setWrongIdx(null);
    setCorrectNextIdx(null);
    // Reset power-up state each round
    setUsedPowerUps({});
    setReplayShapeIdx(null);
    setSafetyNetArmed(false);

    let idx = 0;
    const showNext = () => {
      if (!mountedRef.current) return;
      if (idx < shapes.length) {
        setShowingIdx(idx);
        idx++;
        timerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setShowingIdx(-1);
          timerRef.current = setTimeout(showNext, 300);
        }, 1000);
      } else {
        timerRef.current = setTimeout(() => { if (mountedRef.current) setPhase('pause'); }, 300);
      }
    };
    timerRef.current = setTimeout(showNext, 500);
  }, [shapes]);

  useEffect(() => {
    if (phase !== 'pause') return;
    timerRef.current = setTimeout(() => setPhase('recall'), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  useEffect(() => { if (round) startShowing(); }, [roundIdx, round]);
  useEffect(() => { onRoundChange?.(roundIdx); }, [roundIdx, onRoundChange]);

  const handleTapShape = useCallback((shapeIndex: number) => {
    if (phase !== 'recall') return;
    const expectedOrder = tappedOrder.length;
    const correctShapeIndex = shapes.findIndex((s: any) => s.order === expectedOrder + 1);
    if (correctShapeIndex === -1) return;

    if (shapeIndex === correctShapeIndex) {
      const newTapped = [...tappedOrder, shapeIndex];
      setTappedOrder(newTapped);
      sounds.play('correct');

      if (newTapped.length === shapes.length) {
        const score = shapes.length * 20 + 50;
        setRoundScores(prev => [...prev, score]);
        setPhase('round_done');
        sounds.play('levelComplete');
      }
    } else if (safetyNetArmed) {
      // Safety Net consumes its charge and turns this into a no-op
      // so the sequence continues. Provide a gentle audio cue.
      setSafetyNetArmed(false);
      sounds.play('powerUp');
    } else {
      setWrongIdx(shapeIndex);
      setCorrectNextIdx(correctShapeIndex);
      setPhase('wrong');
      sounds.play('wrong');
      const score = tappedOrder.length * 20;
      setRoundScores(prev => [...prev, score]);
      timerRef.current = setTimeout(() => setPhase('round_done'), 1500);
    }
  }, [phase, tappedOrder, shapes, safetyNetArmed]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < totalRounds) {
      setRoundIdx(prev => prev + 1);
    } else {
      // A round is "correct" only when the player tapped every shape
      // in the right order. The full-clear bonus (`shapes.length * 20
      // + 50`) is what distinguishes a perfect round from a partial
      // run, so we use it as the threshold.
      const fullClearMin = shapes.length * 20 + 50;
      const correctRounds = roundScores.filter((s) => s >= fullClearMin).length;
      onComplete(roundScores.reduce((a, b) => a + b, 0), correctRounds);
    }
  }, [roundIdx, totalRounds, roundScores, shapes.length, onComplete]);

  if (!round) return null;

  const lastScore = roundScores[roundScores.length - 1] ?? 0;
  const nextExpected = tappedOrder.length + 1;

  return (
    <View style={s.container}>
      {phase === 'showing' && <Text style={[s.phaseLabel, { color: modeColor }]}>{t('modes.watch_carefully')}</Text>}
      {phase === 'pause' && <Text style={[s.phaseLabel, { color: modeColor }]}>{t('modes.tap_in_order')}</Text>}
      {phase === 'recall' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>{t('game_indicators.tap_in_order_next', { n: nextExpected })}</Text>
          <Text style={[s.progressText, { color: colors.textLight }]}>{t('game_indicators.correct_progress', { done: tappedOrder.length, total: shapes.length })}</Text>
        </>
      )}
      {phase === 'wrong' && <Text style={[s.phaseLabel, { color: colors.wrong }]}>{t('modes.sequence_wrong')}</Text>}
      {phase === 'recall' && safetyNetArmed && (
        <Text style={[s.progressText, { color: colors.correct }]}>{t('game_indicators.safety_net_armed')}</Text>
      )}

      {phase !== 'round_done' && (
        <View style={[s.canvas, { backgroundColor: colors.card }]}>
          {phase === 'showing' && showingIdx >= 0 && showingIdx < shapes.length && (() => {
            const sh = shapes[showingIdx];
            const sz = sh.size ?? 32;
            return (
              <View style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }], alignItems: 'center' }}>
                <ShapeSvg type={sh.type} color={sh.color} size={sz} />
                <View style={[s.orderBadge, { backgroundColor: modeColor }]}>
                  <Text style={s.orderText}>{sh.order}</Text>
                </View>
              </View>
            );
          })()}

          {/* Replay One power-up: briefly flash the LAST shape in the
              sequence during recall so the player can verify it. */}
          {phase === 'recall' && replayShapeIdx !== null && replayShapeIdx >= 0 && (() => {
            const sh = shapes[replayShapeIdx];
            if (!sh) return null;
            const sz = sh.size ?? 32;
            return (
              <View style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }], alignItems: 'center', zIndex: 10 }} pointerEvents="none">
                <ShapeSvg type={sh.type} color={sh.color} size={sz + 6} />
                <View style={[s.orderBadge, { backgroundColor: modeColor }]}>
                  <Text style={s.orderText}>{sh.order}</Text>
                </View>
              </View>
            );
          })()}

          {(phase === 'recall' || phase === 'wrong') && shapes.map((sh: any, i: number) => {
            const isTapped = tappedOrder.includes(i);
            const isWrong = wrongIdx === i;
            const isCorrectNext = correctNextIdx === i && phase === 'wrong';
            const sz = sh.size ?? 32;

            if (phase === 'wrong' && !isTapped && !isWrong && !isCorrectNext) {
              return (
                <View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }], opacity: 0.2 }}>
                  <ShapeSvg type={sh.type} color="#D1D5DB" size={sz} />
                </View>
              );
            }

            const shapeColor = isTapped ? sh.color : isWrong ? colors.wrong : isCorrectNext ? '#D4A012' : '#D1D5DB';

            return (
              <Pressable
                key={i}
                style={[
                  { position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }] },
                  !isTapped && !isWrong && !isCorrectNext && { borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed' as const, borderRadius: sz / 2 },
                ]}
                onPress={() => phase === 'recall' && !isTapped && handleTapShape(i)}
                disabled={phase !== 'recall' || isTapped}
              >
                <View style={{ alignItems: 'center' }}>
                  <ShapeSvg type={sh.type} color={shapeColor} size={sz} />
                  {isTapped && (
                    <View style={[s.orderBadge, { backgroundColor: colors.correct }]}>
                      <Text style={s.orderText}>{tappedOrder.indexOf(i) + 1}</Text>
                    </View>
                  )}
                  {isCorrectNext && (
                    <View style={[s.orderBadge, { backgroundColor: '#D4A012' }]}>
                      <Text style={s.orderText}>{tappedOrder.length + 1}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {phase === 'round_done' && (
        <View style={s.centered}>
          <Text style={[s.roundTitle, { color: modeColor }]}>Round {roundIdx + 1}</Text>
          <Text style={[s.roundScore, { color: colors.text }]}>{lastScore} pts</Text>
          <Text style={[s.roundDetail, { color: colors.textMid }]}>
            {tappedOrder.length === shapes.length ? `Perfect! All ${shapes.length} correct + bonus` : `${tappedOrder.length}/${shapes.length} correct`}
          </Text>
          <Pressable style={[s.btn, { backgroundColor: modeColor }]} onPress={nextRound}>
            <Text style={s.btnText}>{roundIdx + 1 < totalRounds ? 'Next Round' : 'See Results'}</Text>
          </Pressable>
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

      {/* Sequence power-ups — available during showing + recall (not
          wrong / round_done). Replay only useful in recall but we
          don't hide it to keep the bar stable. */}
      {(phase === 'showing' || phase === 'pause' || phase === 'recall') && (
        <ModePowerUpBar mode="sequence" used={usedPowerUps} onUse={handleUsePowerUp} onBuyOut={(id) => setBuyPopupId(id as PowerUpId)} />
      )}

      <BuyPowerUpPopup powerUpId={buyPopupId} onClose={() => setBuyPopupId(null)} onBought={handleBuyPopupBought} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  progressText: { fontSize: 12, textAlign: 'center' },
  canvas: { aspectRatio: 1, width: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', zIndex: 1 },
  orderBadge: { position: 'absolute', bottom: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  roundTitle: { fontSize: 22, fontWeight: '700' },
  roundScore: { fontSize: 42, fontWeight: '900' },
  roundDetail: { fontSize: 14 },
  btn: { paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  scoreDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
