import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';

type Phase = 'memorise' | 'transition' | 'recall' | 'feedback';
type TileState = 'hidden' | 'correct' | 'wrong' | 'revealed';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

const GRID_PADDING = 20;
const GAP = 8;

export default function ColourChainGame({ modeData, onComplete, modeColor }: Props) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('memorise');
  const [recallIdx, setRecallIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [tileStates, setTileStates] = useState<Record<number, TileState>>({});
  const [memoriseProgress, setMemoriseProgress] = useState(1);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const grid = modeData?.grid ?? [];
  const rounds = modeData?.rounds ?? [];
  const gridCols = modeData?.gridCols ?? 3;
  const gridRows = modeData?.gridRows ?? 4;
  const containerWidth = Math.min(Dimensions.get('window').width, 430);
  const tileSize = Math.floor((containerWidth - GRID_PADDING * 2 - GAP * (gridCols - 1)) / gridCols);
  const totalRounds = rounds.length;
  const currentRound = rounds[recallIdx];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Init tile states
  useEffect(() => {
    const init: Record<number, TileState> = {};
    for (let i = 0; i < 12; i++) init[i] = 'hidden';
    setTileStates(init);
  }, []);

  // Memorise phase \u2014 3 second timer
  useEffect(() => {
    if (phase !== 'memorise') return;
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setMemoriseProgress(Math.max(0, 1 - elapsed / 3));
      if (elapsed >= 3) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('transition');
        timerRef.current = setTimeout(() => setPhase('recall'), 500);
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  const handleTapTile = useCallback((tileIdx: number) => {
    if (phase !== 'recall' || !currentRound) return;
    if (tileStates[tileIdx] !== 'hidden') return;

    const isCorrect = currentRound.correctIndices.includes(tileIdx);
    setLastCorrect(isCorrect);
    setScores(prev => [...prev, isCorrect ? 100 : 0]);
    setPhase('feedback');

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
        timerRef.current = setTimeout(() => {
          setLastCorrect(null);
          if (recallIdx + 1 < totalRounds) {
            setRecallIdx(prev => prev + 1);
            setPhase('recall');
          } else {
            onComplete([...scores, 0].reduce((a, b) => a + b, 0));
          }
        }, 1100);
      }, 400);
    }
  }, [phase, currentRound, recallIdx, totalRounds, scores, tileStates, onComplete]);

  if (!grid.length) return null;

  const timerColor = memoriseProgress > 0.4 ? modeColor : memoriseProgress > 0.15 ? '#D4A012' : '#FF6B6B';

  return (
    <View style={s.container}>
      {phase === 'memorise' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>Memorise the colours!</Text>
          <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
            <View style={[s.timerFill, { width: `${Math.round(memoriseProgress * 100)}%`, backgroundColor: timerColor }]} />
          </View>
        </>
      )}
      {phase === 'transition' && <Text style={[s.phaseLabel, { color: colors.textMid }]}>Get ready...</Text>}
      {(phase === 'recall' || phase === 'feedback') && currentRound && (
        <>
          <Text style={[s.phaseLabel, { color: colors.textMid }]}>Where was this colour?</Text>
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

              let bgColor: string;
              let borderColor = 'transparent';
              let borderWidth = 0;

              if (isMemorising) {
                bgColor = tileHex;
              } else if (isTransition) {
                bgColor = '#E8E6E1';
              } else {
                switch (state) {
                  case 'hidden': bgColor = '#E8E6E1'; break;
                  case 'correct': bgColor = tileHex; borderColor = '#00B894'; borderWidth = 3; break;
                  case 'wrong': bgColor = '#FF6B6B'; borderColor = '#FF6B6B'; borderWidth = 2; break;
                  case 'revealed': bgColor = tileHex; borderColor = '#D4A012'; borderWidth = 2; break;
                }
              }

              const tappable = !isMemorising && !isTransition && state === 'hidden' && phase === 'recall';

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
