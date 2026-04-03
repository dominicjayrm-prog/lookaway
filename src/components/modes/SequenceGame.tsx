import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';

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

type Phase = 'showing' | 'recall' | 'wrong' | 'round_done';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

export default function SequenceGame({ modeData, onComplete, modeColor }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('showing');
  const [showingIdx, setShowingIdx] = useState(-1); // which shape is currently visible during showing phase
  const [tappedOrder, setTappedOrder] = useState<number[]>([]); // indices tapped by player
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [correctNextIdx, setCorrectNextIdx] = useState<number | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;
  const shapes = round?.shapes ?? [];

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  // Show shapes one by one
  const startShowing = useCallback(() => {
    setPhase('showing');
    setShowingIdx(-1);
    setTappedOrder([]);
    setWrongIdx(null);
    setCorrectNextIdx(null);

    let idx = 0;
    const showNext = () => {
      if (idx < shapes.length) {
        setShowingIdx(idx);
        idx++;
        timerRef.current = setTimeout(() => {
          setShowingIdx(-1); // hide
          timerRef.current = setTimeout(showNext, 300); // brief gap
        }, 1000);
      } else {
        // All shown — move to recall
        timerRef.current = setTimeout(() => setPhase('recall'), 500);
      }
    };
    timerRef.current = setTimeout(showNext, 500);
  }, [shapes]);

  useEffect(() => { if (round) startShowing(); }, [roundIdx, round]);

  const handleTapShape = useCallback((shapeIndex: number) => {
    if (phase !== 'recall') return;
    const expectedOrder = tappedOrder.length; // 0-based: which position in sequence they should tap next
    const correctShapeIndex = shapes.findIndex((s: any) => s.order === expectedOrder + 1);

    if (correctShapeIndex === -1) return; // invalid data — skip

    if (shapeIndex === correctShapeIndex) {
      // Correct!
      const newTapped = [...tappedOrder, shapeIndex];
      setTappedOrder(newTapped);

      if (newTapped.length === shapes.length) {
        // All correct — perfect round!
        const score = shapes.length * 20 + 50;
        setRoundScores(prev => [...prev, score]);
        setPhase('round_done');
      }
    } else {
      // Wrong — round over
      setWrongIdx(shapeIndex);
      setCorrectNextIdx(correctShapeIndex);
      setPhase('wrong');
      const score = tappedOrder.length * 20;
      setRoundScores(prev => [...prev, score]);
      timerRef.current = setTimeout(() => setPhase('round_done'), 1500);
    }
  }, [phase, tappedOrder, shapes]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < totalRounds) {
      setRoundIdx(prev => prev + 1);
    } else {
      onComplete(roundScores.reduce((a, b) => a + b, 0));
    }
  }, [roundIdx, totalRounds, roundScores, onComplete]);

  if (!round) return null;

  const lastScore = roundScores[roundScores.length - 1] ?? 0;

  return (
    <View style={s.container}>
      {phase === 'showing' && <Text style={[s.phaseLabel, { color: modeColor }]}>Watch the order!</Text>}
      {phase === 'recall' && <Text style={[s.phaseLabel, { color: modeColor }]}>Tap in order: 1st, 2nd, 3rd...</Text>}
      {phase === 'wrong' && <Text style={[s.phaseLabel, { color: colors.wrong }]}>Wrong! The sequence ended.</Text>}
      {phase === 'recall' && <Text style={[s.progressText, { color: colors.textLight }]}>{tappedOrder.length}/{shapes.length} correct so far</Text>}

      {phase !== 'round_done' && (
        <View style={[s.canvas, { backgroundColor: colors.card }]}>
          {shapes.map((sh: any, i: number) => {
            const isShowing = phase === 'showing' && showingIdx === i;
            const isTapped = tappedOrder.includes(i);
            const isWrong = wrongIdx === i;
            const isCorrectNext = correctNextIdx === i && phase === 'wrong';
            const isGrey = phase === 'recall' && !isTapped;
            const sz = sh.size ?? 30;

            return (
              <Pressable
                key={i}
                style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sz / 2 }, { translateY: -sz / 2 }], opacity: phase === 'showing' && showingIdx !== i && showingIdx !== -1 ? 0 : 1 }}
                onPress={() => phase === 'recall' && !isTapped && handleTapShape(i)}
                disabled={phase !== 'recall' || isTapped}
              >
                {isShowing && (
                  <View style={{ alignItems: 'center' }}>
                    <ShapeSvg type={sh.type} color={sh.color} size={sz} />
                    <View style={[s.orderBadge, { backgroundColor: modeColor }]}>
                      <Text style={s.orderText}>{sh.order}</Text>
                    </View>
                  </View>
                )}
                {phase !== 'showing' && (
                  <View style={{ alignItems: 'center' }}>
                    <ShapeSvg
                      type={sh.type}
                      color={isTapped ? sh.color : isWrong ? colors.wrong : isCorrectNext ? colors.correct : '#D1D5DB'}
                      size={sz}
                    />
                    {isTapped && (
                      <View style={[s.orderBadge, { backgroundColor: colors.correct }]}>
                        <Text style={s.orderText}>{tappedOrder.indexOf(i) + 1}</Text>
                      </View>
                    )}
                    {isCorrectNext && (
                      <View style={[s.orderBadge, { backgroundColor: colors.correct }]}>
                        <Text style={s.orderText}>{tappedOrder.length + 1}</Text>
                      </View>
                    )}
                  </View>
                )}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  progressText: { fontSize: 12, textAlign: 'center' },
  canvas: { flex: 1, borderRadius: 16, position: 'relative', overflow: 'hidden' },
  orderBadge: { position: 'absolute', bottom: -8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  roundTitle: { fontSize: 22, fontWeight: '700' },
  roundScore: { fontSize: 42, fontWeight: '900' },
  roundDetail: { fontSize: 14 },
  btn: { paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
