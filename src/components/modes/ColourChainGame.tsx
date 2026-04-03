import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';

type Phase = 'show_grid' | 'blank' | 'recall' | 'feedback';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

export default function ColourChainGame({ modeData, onComplete, modeColor }: Props) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('show_grid');
  const [recallIdx, setRecallIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [lastTap, setLastTap] = useState<{ idx: number; correct: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const grid = modeData?.grid ?? [];
  const rounds = modeData?.rounds ?? [];
  const totalRounds = rounds.length;
  const currentRound = rounds[recallIdx];

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  // Show grid for 3 seconds, then blank, then recall
  useEffect(() => {
    setPhase('show_grid');
    timerRef.current = setTimeout(() => {
      setPhase('blank');
      timerRef.current = setTimeout(() => setPhase('recall'), 500);
    }, 3000);
  }, []);

  const handleTapTile = useCallback((tileIdx: number) => {
    if (phase !== 'recall' || !currentRound) return;

    const correct = currentRound.correctIndices.includes(tileIdx);
    const score = correct ? 100 : 0;
    setLastTap({ idx: tileIdx, correct });
    setScores(prev => [...prev, score]);
    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      setLastTap(null);
      if (recallIdx + 1 < totalRounds) {
        setRecallIdx(prev => prev + 1);
        setPhase('recall');
      } else {
        onComplete([...scores, score].reduce((a, b) => a + b, 0));
      }
    }, 1200);
  }, [phase, currentRound, recallIdx, totalRounds, scores, onComplete]);

  const renderGrid = (showColors: boolean) => (
    <View style={s.grid}>
      {[0, 1, 2, 3].map(row => (
        <View key={row} style={s.gridRow}>
          {[0, 1, 2].map(col => {
            const idx = row * 3 + col;
            const tile = grid[idx];
            if (!tile) return <View key={col} style={s.tile} />;

            const isRevealed = lastTap && phase === 'feedback' && currentRound?.correctIndices.includes(idx);
            const isTapped = lastTap?.idx === idx;
            const tileColor = showColors ? tile.hex : (
              isTapped ? (lastTap?.correct ? colors.correct : colors.wrong) :
              isRevealed ? tile.hex :
              colors.surface
            );
            const borderColor = isTapped && phase === 'feedback'
              ? (lastTap?.correct ? colors.correct : colors.wrong)
              : isRevealed ? colors.correct : 'transparent';

            return (
              <Pressable
                key={col}
                style={[s.tile, { backgroundColor: tileColor, borderWidth: 2.5, borderColor }]}
                onPress={() => !showColors && phase === 'recall' && handleTapTile(idx)}
                disabled={showColors || phase !== 'recall'}
              >
                {showColors && <Text style={s.tileLabel}>{tile.name?.[0]}</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  if (!currentRound && (phase === 'recall' || phase === 'feedback')) return null;

  return (
    <View style={s.container}>
      {phase === 'show_grid' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>Memorise the colours!</Text>
          {renderGrid(true)}
        </>
      )}

      {phase === 'blank' && (
        <View style={s.centered}>
          <Text style={[s.phaseLabel, { color: colors.textMid }]}>Get ready...</Text>
        </View>
      )}

      {(phase === 'recall' || phase === 'feedback') && currentRound && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>Where was this colour?</Text>
          <Text style={[s.recallProgress, { color: colors.textLight }]}>{recallIdx + 1}/{totalRounds}</Text>
          <View style={[s.askColorBox, { backgroundColor: currentRound.askColor.hex }]}>
            <Text style={s.askColorText}>{currentRound.askColor.name}</Text>
          </View>
          {renderGrid(false)}
          {phase === 'feedback' && lastTap && (
            <Text style={[s.feedbackText, { color: lastTap.correct ? colors.correct : colors.wrong }]}>
              {lastTap.correct ? 'Correct! +100 pts' : 'Wrong!'}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 10, alignItems: 'center' },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  recallProgress: { fontSize: 12, textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  askColorBox: { width: 64, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  askColorText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  grid: { gap: 8, marginTop: 12 },
  gridRow: { flexDirection: 'row', gap: 8 },
  tile: { width: 80, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' },
  feedbackText: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8 },
});
