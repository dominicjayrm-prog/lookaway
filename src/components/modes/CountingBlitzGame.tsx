import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';

type Phase = 'chaos' | 'question' | 'feedback' | 'round_done';

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
  const [elapsed, setElapsed] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const eventTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); if (intervalRef.current) clearInterval(intervalRef.current); eventTimersRef.current.forEach(t => clearTimeout(t)); eventTimersRef.current = []; }; }, []);

  const startChaos = useCallback(() => {
    if (!round) return;
    setPhase('chaos');
    setVisibleShapes([]);
    setSelectedOption(null);
    setElapsed(0);

    const startTime = Date.now();

    // Update elapsed every 100ms
    intervalRef.current = setInterval(() => {
      const e = (Date.now() - startTime) / 1000;
      setElapsed(e);
      if (e >= 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('question');
      }
    }, 100);

    // Schedule shape appearances
    eventTimersRef.current.forEach(t => clearTimeout(t));
    eventTimersRef.current = [];
    round.events.forEach((ev: any) => {
      const t = setTimeout(() => {
        setVisibleShapes(prev => [...prev, { ...ev, key: ev.id }]);
        const t2 = setTimeout(() => {
          setVisibleShapes(prev => prev.filter(s => s.key !== ev.id));
        }, ev.duration * 1000);
        eventTimersRef.current.push(t2);
      }, ev.appearAt * 1000);
      eventTimersRef.current.push(t);
    });

    // End after 5 seconds
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setVisibleShapes([]);
      setPhase('question');
    }, 5100);
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

  const timeLeft = Math.max(0, 5 - elapsed);

  return (
    <View style={s.container}>
      {/* Chaos phase */}
      {phase === 'chaos' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>COUNT THE COLOURS!</Text>
          <View style={s.timerRow}>
            <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
              <View style={[s.timerFill, { width: `${(timeLeft / 5) * 100}%`, backgroundColor: modeColor }]} />
            </View>
            <Text style={[s.timerText, { color: colors.textMid }]}>{timeLeft.toFixed(1)}s</Text>
          </View>
          <View style={[s.canvas, { backgroundColor: colors.card }]}>
            {visibleShapes.map((sh) => (
              <View
                key={sh.key}
                style={{
                  position: 'absolute',
                  left: `${sh.x}%`,
                  top: `${sh.y}%`,
                  width: sh.size,
                  height: sh.size,
                  borderRadius: sh.shapeType === 'circle' ? sh.size / 2 : 4,
                  backgroundColor: sh.color,
                  transform: [{ translateX: -sh.size / 2 }, { translateY: -sh.size / 2 }],
                }}
              />
            ))}
          </View>
        </>
      )}

      {/* Question phase */}
      {(phase === 'question' || phase === 'feedback') && (
        <View style={s.questionArea}>
          <View style={[s.askColorBox, { backgroundColor: round.askColor.hex }]}>
            <Text style={s.askColorText}>{round.askColor.name.toUpperCase()}</Text>
          </View>
          <Text style={[s.questionText, { color: colors.text }]}>
            How many {round.askColor.name} shapes appeared?
          </Text>
          <View style={s.optionsGrid}>
            {round.options.map((opt: number, i: number) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === round.correctIndex;
              const showResult = phase === 'feedback';

              let bg = colors.surface;
              let textColor = colors.text;
              if (showResult && isCorrect) { bg = colors.correctSoft; textColor = colors.correct; }
              else if (showResult && isSelected && !isCorrect) { bg = colors.wrongSoft; textColor = colors.wrong; }
              else if (isSelected) { bg = colors.accentSoft; textColor = colors.accent; }

              return (
                <Pressable
                  key={i}
                  style={[s.optionBtn, { backgroundColor: bg, borderColor: showResult && isCorrect ? colors.correct : 'transparent', borderWidth: showResult && isCorrect ? 2 : 0 }]}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  phaseLabel: { fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 3 },
  timerText: { fontSize: 13, fontWeight: '700', width: 40 },
  canvas: { flex: 1, borderRadius: 16, position: 'relative', overflow: 'hidden' },
  questionArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 16 },
  askColorBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  askColorText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  questionText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  optionBtn: { width: 80, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 24, fontWeight: '800' },
  feedbackText: { fontSize: 16, fontWeight: '700' },
});
