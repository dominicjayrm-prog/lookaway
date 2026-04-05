import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';

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
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

export default function CountingBlitzGame({ modeData, onComplete, modeColor }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('chaos');
  const [visibleShapes, setVisibleShapes] = useState<any[]>([]);
  const [chaosProgress, setChaosProgress] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const roundStartRef = useRef(0);

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startChaos = useCallback(() => {
    if (!round) return;
    setPhase('chaos');
    setVisibleShapes([]);
    setSelectedOption(null);
    setChaosProgress(1);
    roundStartRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      setChaosProgress(Math.max(0, 1 - elapsed / 5));

      const nowVisible = round.events.filter((e: any) =>
        elapsed >= e.appearAt && elapsed < e.appearAt + e.duration
      );
      setVisibleShapes(nowVisible);

      if (elapsed >= 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setVisibleShapes([]);
        setPhase('question');
      }
    }, 50);
  }, [round]);

  useEffect(() => { if (round) startChaos(); }, [roundIdx, round]);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (phase !== 'question' || !round) return;
    setSelectedOption(optionIdx);
    const correct = optionIdx === round.correctIndex;
    const score = correct ? 100 : 0;
    setRoundScores(prev => [...prev, score]);
    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      if (roundIdx + 1 < totalRounds) {
        setRoundIdx(prev => prev + 1);
      } else {
        onComplete([...roundScores, score].reduce((a, b) => a + b, 0));
      }
    }, 1500);
  }, [phase, round, roundIdx, totalRounds, roundScores, onComplete]);

  if (!round) return null;

  const timerColor = chaosProgress > 0.4 ? modeColor : chaosProgress > 0.15 ? '#D4A012' : '#FF6B6B';

  return (
    <View style={s.container}>
      {phase === 'chaos' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>COUNT THE COLOURS!</Text>
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
              {selectedOption === round.correctIndex ? 'Correct! +100 pts' : `Wrong! It was ${round.correctCount}`}
            </Text>
          )}
        </View>
      )}

      <View style={s.scoreRow}>
        {roundScores.map((sc, i) => (
          <View key={i} style={[s.scoreDot, { backgroundColor: sc > 0 ? colors.correct : colors.wrong }]}>
            <Text style={s.scoreDotText}>{sc > 0 ? '\\u2713' : '\\u2715'}</Text>
          </View>
        ))}
        {Array.from({ length: totalRounds - roundScores.length }).map((_, i) => (
          <View key={`e${i}`} style={[s.scoreDot, { backgroundColor: colors.border }]} />
        ))}
      </View>
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
