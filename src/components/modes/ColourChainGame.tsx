import React, { useState, useCallback, useRef, useEffect } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ModePowerUpBar } from '@/src/components/ModePowerUpBar';
import { BuyPowerUpPopup } from '@/src/components/BuyPowerUpPopup';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { sounds } from '@/src/lib/sounds';
import type { PowerUpId } from '@/src/utils/scoring';

type Phase = 'memorise' | 'transition' | 'recall' | 'feedback';
type TileState = 'hidden' | 'correct' | 'wrong' | 'revealed';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
  /**
   * Multiplier on the memorise phase. Solo = 1.0, challenge passes
   * `CHALLENGE_VIEW_TIME_MULT` (1.3) so the tile-memorise window
   * lengthens from 3s to 3.9s in 1v1 — matching the Classic +
   * Speed Recall / Snap Match / Counting Blitz buffers.
   */
  viewTimeMultiplier?: number;
  /** Keeps parent external round header in sync with internal state. */
  onRoundChange?: (roundIdx: number) => void;
}

const GRID_PADDING = 20;
const GAP = 8;

export default function ColourChainGame({ modeData, onComplete, modeColor, viewTimeMultiplier = 1, onRoundChange }: Props) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('memorise');
  const [recallIdx, setRecallIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [tileStates, setTileStates] = useState<Record<number, TileState>>({});
  const [memoriseProgress, setMemoriseProgress] = useState(1);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const grid = modeData?.grid ?? [];
  const rounds = modeData?.rounds ?? [];
  const gridCols = modeData?.gridCols ?? 3;
  const gridRows = modeData?.gridRows ?? 4;
  const containerWidth = Math.min(Dimensions.get('window').width, 430);
  const tileSize = Math.floor((containerWidth - GRID_PADDING * 2 - GAP * (gridCols - 1)) / gridCols);
  const totalRounds = rounds.length;
  const currentRound = rounds[recallIdx];

  // ── Colour Chain power-ups ──
  //  - cc_slow_time: +2s to the 3s memorise window
  //  - cc_reveal_one: keep one random tile of the asked colour
  //    revealed during recall (shown as an anchor hint)
  const usePowerUpStore = useGameStore((s) => s.usePowerUp);
  const powerUpCounts = useGameStore((s) => s.powerUps) ?? {};
  const [usedPowerUps, setUsedPowerUps] = useState<Record<string, boolean>>({});
  const [buyPopupId, setBuyPopupId] = useState<PowerUpId | null>(null);
  const [slowTimeBonus, setSlowTimeBonus] = useState(0); // seconds
  const [anchorTileIdx, setAnchorTileIdx] = useState<number | null>(null);

  const handleUsePowerUp = useCallback((id: string) => {
    if (usedPowerUps[id]) return;
    if ((powerUpCounts[id] ?? 0) <= 0) { setBuyPopupId(id as PowerUpId); return; }
    usePowerUpStore(id as PowerUpId);
    setUsedPowerUps(p => ({ ...p, [id]: true }));
    sounds.play('powerUp');
    if (id === 'cc_slow_time') {
      setSlowTimeBonus(2);
    } else if (id === 'cc_reveal_one' && currentRound) {
      // Pick one random correct tile as an anchor.
      const correctIndices: number[] = currentRound.correctIndices ?? [];
      if (correctIndices.length > 0) {
        const pick = correctIndices[Math.floor(Math.random() * correctIndices.length)];
        setAnchorTileIdx(pick);
      }
    }
  }, [usedPowerUps, powerUpCounts, usePowerUpStore, currentRound]);

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

  // Reset power-up state whenever a new round begins.
  useEffect(() => {
    setUsedPowerUps({});
    setSlowTimeBonus(0);
    setAnchorTileIdx(null);
  }, [recallIdx]);

  // Init/reset tile states (on mount and between rounds)
  useEffect(() => {
    const total = gridCols * gridRows;
    const init: Record<number, TileState> = {};
    for (let i = 0; i < total; i++) init[i] = 'hidden';
    setTileStates(init);
  }, [recallIdx, gridCols, gridRows]);

  // Sync parent's external round counter to our internal recallIdx
  useEffect(() => { onRoundChange?.(recallIdx); }, [recallIdx, onRoundChange]);

  // Memorise phase - base 3s (scaled by challenge multiplier) +
  // slow-time power-up bonus. The challenge multiplier only
  // stretches the BASE window; slow-time is a flat power-up
  // bonus that adds exactly +2s regardless of context.
  useEffect(() => {
    if (phase !== 'memorise') return;
    const startTime = Date.now();
    const totalSec = 3 * viewTimeMultiplier + slowTimeBonus;
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setMemoriseProgress(Math.max(0, 1 - elapsed / totalSec));
      if (elapsed >= totalSec) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        sounds.play('whoosh');
        setPhase('transition');
        timerRef.current = setTimeout(() => setPhase('recall'), 500);
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, slowTimeBonus]);

  const handleTapTile = useCallback((tileIdx: number) => {
    if (phase !== 'recall' || !currentRound) return;
    if (tileStates[tileIdx] !== 'hidden') return;

    const isCorrect = currentRound.correctIndices.includes(tileIdx);
    setLastCorrect(isCorrect);
    setScores(prev => [...prev, isCorrect ? 100 : 0]);
    setPhase('feedback');
    sounds.play(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      const newStates = { ...tileStates, [tileIdx]: 'correct' as TileState };
      currentRound.correctIndices.forEach((idx: number) => {
        if (idx !== tileIdx && newStates[idx] === 'hidden') {
          newStates[idx] = 'revealed';
        }
      });
      setTileStates(newStates);

      timerRef.current = setTimeout(() => {
        setLastCorrect(null);
        if (recallIdx + 1 < totalRounds) {
          setRecallIdx(prev => prev + 1);
          setPhase('recall');
        } else {
          onComplete([...scores, 100].reduce((a, b) => a + b, 0));
        }
      }, 1200);
    } else {
      setTileStates(prev => ({ ...prev, [tileIdx]: 'wrong' }));

      timerRef.current = setTimeout(() => {
        setTileStates(prev => {
          const newStates = { ...prev, [tileIdx]: 'hidden' as TileState };
          currentRound.correctIndices.forEach((idx: number) => {
            newStates[idx] = 'revealed';
          });
          return newStates;
        });
        // After showing correct tiles, advance to next round
        const inner = setTimeout(() => {
          setLastCorrect(null);
          if (recallIdx + 1 < totalRounds) {
            setRecallIdx(prev => prev + 1);
            setPhase('recall');
          } else {
            onComplete([...scores, 0].reduce((a, b) => a + b, 0));
          }
        }, 1100);
        timerRef.current = inner;
      }, 400);
    }
  }, [phase, currentRound, recallIdx, totalRounds, scores, tileStates, onComplete]);

  if (!grid.length) return null;

  const timerColor = memoriseProgress > 0.4 ? modeColor : memoriseProgress > 0.15 ? '#D4A012' : '#FF6B6B';

  return (
    <View style={s.container}>
      {phase === 'memorise' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>{t('modes.memorise_colours')}</Text>
          <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
            <View style={[s.timerFill, { width: `${Math.round(memoriseProgress * 100)}%`, backgroundColor: timerColor }]} />
          </View>
        </>
      )}
      {phase === 'transition' && (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
          <AnimatedBlink expression="blank" size={56} entrance="spring" />
          <Text style={[s.phaseLabel, { color: colors.textMid, marginTop: 8 }]}>{t('modes.get_ready')}</Text>
        </View>
      )}
      {(phase === 'recall' || phase === 'feedback') && currentRound && (
        <>
          <Text style={[s.phaseLabel, { color: colors.textMid }]}>{t('modes.where_was_colour')}</Text>
          <View style={s.promptRow}>
            <View style={[s.askSwatch, { backgroundColor: currentRound.askColor.hex }]} />
            <Text style={[s.askName, { color: currentRound.askColor.hex }]}>{currentRound.askColor.name}</Text>
          </View>
        </>
      )}

      <View style={[s.grid, { paddingHorizontal: GRID_PADDING }]}>
        {Array.from({ length: gridRows }, (_, row) => (
          <View key={row} style={s.gridRow}>
            {Array.from({ length: gridCols }, (_, col) => {
              const idx = row * gridCols + col;
              const tile = grid[idx];
              if (!tile) return <View key={col} style={[s.tile, { width: tileSize, height: tileSize * 0.75 }]} />;

              const state = tileStates[idx] ?? 'hidden';
              const isMemorising = phase === 'memorise';
              const isTransition = phase === 'transition';
              const tileHex = tile.hex ?? tile.color?.hex ?? '#E8E6E1';
              // Reveal One anchor — this tile stays coloured during
              // recall so the player has a hint.
              const isAnchor = anchorTileIdx === idx && (phase === 'recall' || phase === 'feedback');

              let bgColor: string;
              let borderColor = 'transparent';
              let borderWidth = 0;

              if (isMemorising) {
                bgColor = tileHex;
              } else if (isTransition) {
                bgColor = '#E8E6E1';
              } else if (isAnchor && state === 'hidden') {
                bgColor = tileHex;
                borderColor = '#D4A012';
                borderWidth = 2;
              } else {
                switch (state) {
                  case 'hidden': bgColor = '#E8E6E1'; break;
                  case 'correct': bgColor = tileHex; borderColor = '#00B894'; borderWidth = 3; break;
                  case 'wrong': bgColor = '#FF6B6B'; borderColor = '#FF6B6B'; borderWidth = 2; break;
                  case 'revealed': bgColor = tileHex; borderColor = '#D4A012'; borderWidth = 2; break;
                }
              }

              // Anchored tile is non-tappable; it's a hint, not a click target.
              const tappable = !isMemorising && !isTransition && state === 'hidden' && phase === 'recall' && !isAnchor;

              return (
                <Pressable
                  key={col}
                  style={[s.tile, { width: tileSize, height: tileSize * 0.75, backgroundColor: bgColor, borderWidth, borderColor }]}
                  onPress={() => tappable && handleTapTile(idx)}
                  disabled={!tappable}
                />
              );
            })}
          </View>
        ))}
      </View>

      {phase === 'feedback' && lastCorrect !== null && (
        <Text style={[s.feedbackText, { color: lastCorrect ? colors.correct : colors.wrong }]}>
          {lastCorrect ? 'Correct! +100 pts' : 'Wrong!'}
        </Text>
      )}

      <View style={s.scoreRow}>
        {rounds.map((_: any, i: number) => {
          let dotColor = colors.border;
          if (i < scores.length) dotColor = scores[i] > 0 ? '#00B894' : '#FF6B6B';
          else if (i === recallIdx && phase !== 'memorise' && phase !== 'transition') dotColor = modeColor;
          return (
            <View key={i} style={[s.scoreDot, { backgroundColor: dotColor }]}>
              {i < scores.length && <Text style={s.scoreDotText}>{scores[i] > 0 ? '\u2713' : '\u2715'}</Text>}
            </View>
          );
        })}
      </View>

      {/* Colour Chain power-ups — visible during memorise + recall. */}
      {(phase === 'memorise' || phase === 'recall') && (
        <ModePowerUpBar mode="colour_chain" used={usedPowerUps} onUse={handleUsePowerUp} onBuyOut={(id) => setBuyPopupId(id as PowerUpId)} />
      )}

      <BuyPowerUpPopup powerUpId={buyPopupId} onClose={() => setBuyPopupId(null)} onBought={handleBuyPopupBought} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 8, alignItems: 'center' },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  timerTrack: { height: 5, borderRadius: 3, overflow: 'hidden', width: '100%', marginHorizontal: 4 },
  timerFill: { height: '100%', borderRadius: 3 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  askSwatch: { width: 48, height: 48, borderRadius: 12 },
  askName: { fontSize: 20, fontWeight: '800' },
  grid: { gap: 8, marginTop: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  tile: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  feedbackText: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  scoreDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
