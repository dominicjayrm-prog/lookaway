import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Rect, Polygon, Line, Ellipse } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';

function ShapeSvg({ type, color, size }: { type: string; color: string; size: number }) {
  switch (type) {
    case 'circle': return <Svg width={size} height={size} viewBox="0 0 24 24"><SvgCircle cx={12} cy={12} r={10} fill={color} /></Svg>;
    case 'square': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={20} height={20} rx={3} fill={color} /></Svg>;
    case 'triangle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,20 2,20" fill={color} /></Svg>;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,12 12,22 2,12" fill={color} /></Svg>;
    case 'hexagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 21.66,7 21.66,17 12,22 2.34,17 2.34,7" fill={color} /></Svg>;
    case 'pentagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22.47,9.51 18.54,21.49 5.46,21.49 1.53,9.51" fill={color} /></Svg>;
    case 'oval': return <Svg width={size} height={size} viewBox="0 0 24 24"><Ellipse cx={12} cy={12} rx={10} ry={7} fill={color} /></Svg>;
    case 'cross': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8,2 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill={color} /></Svg>;
    case 'arrow': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12,2 L22,12 H16 V22 H8 V12 H2 Z" fill={color} /></Svg>;
    case 'semicircle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2,14 A10,10 0 0,1 22,14 Z" fill={color} /></Svg>;
    case 'parallelogram': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="6,4 22,4 18,20 2,20" fill={color} /></Svg>;
    case 'trapezoid': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="6,4 18,4 22,20 2,20" fill={color} /></Svg>;
    case 'rhombus': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 21,12 12,22 3,12" fill={color} /></Svg>;
    case 'kite': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 20,10 12,22 4,10" fill={color} /></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><SvgCircle cx={12} cy={12} r={10} fill={color} /></Svg>;
  }
}

type Phase = 'viewing' | 'recall' | 'feedback' | 'round_done';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

export default function SpeedRecallGame({ modeData, onComplete, modeColor }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('viewing');
  const [shapeIdx, setShapeIdx] = useState(0);
  const [timerProgress, setTimerProgress] = useState(1);
  const [shapeScores, setShapeScores] = useState<number[]>([]);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [tapResult, setTapResult] = useState<{ tapX: number; tapY: number; actualX: number; actualY: number; dist: number; score: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;
  const shapes = round?.shapes ?? [];
  const currentShape = shapes[shapeIdx];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Start viewing phase with countdown timer
  const startRound = useCallback(() => {
    setPhase('viewing');
    setShapeIdx(0);
    setShapeScores([]);
    setTapResult(null);
    setTimerProgress(1);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimerProgress(Math.max(0, 1 - elapsed / 3000));
    }, 50);

    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerProgress(0);
      setPhase('recall');
    }, 3000);
  }, []);

  useEffect(() => { if (round) startRound(); }, [roundIdx, round]);

  const handleCanvasTap = useCallback((e: any) => {
    if (phase !== 'recall' || !currentShape || tapResult) return;
    const nativeEvent = e.nativeEvent;
    const locationX = nativeEvent.locationX ?? nativeEvent.offsetX ?? 0;
    const locationY = nativeEvent.locationY ?? nativeEvent.offsetY ?? 0;
    const tapX = canvasSize.w > 0 ? (locationX / canvasSize.w) * 100 : 50;
    const tapY = canvasSize.h > 0 ? (locationY / canvasSize.h) * 100 : 50;
    const dist = Math.sqrt((tapX - currentShape.x) ** 2 + (tapY - currentShape.y) ** 2);
    const score = Math.max(0, Math.round(100 - dist * 2)) || 0;

    setTapResult({ tapX, tapY, actualX: currentShape.x, actualY: currentShape.y, dist: Math.round(dist) || 0, score });
    setShapeScores(prev => [...prev, score]);
    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      setTapResult(null);
      if (shapeIdx + 1 < shapes.length) {
        setShapeIdx(prev => prev + 1);
        setPhase('recall');
      } else {
        setShapeScores(prev => {
          const roundTotal = prev.reduce((a, b) => a + b, 0);
          setRoundScores(rs => [...rs, roundTotal]);
          return prev;
        });
        setPhase('round_done');
      }
    }, 1500);
  }, [phase, currentShape, shapeIdx, shapes, shapeScores, canvasSize, tapResult]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < totalRounds) {
      setRoundIdx(prev => prev + 1);
    } else {
      onComplete(roundScores.reduce((a, b) => a + b, 0));
    }
  }, [roundIdx, totalRounds, roundScores, onComplete]);

  if (!round) return null;

  const timerColor = timerProgress > 0.4 ? modeColor : timerProgress > 0.15 ? '#D4A012' : '#FF6B6B';
  const lastRoundScore = roundScores[roundScores.length - 1] ?? 0;

  return (
    <View style={s.container}>
      {/* Viewing phase */}
      {phase === 'viewing' && (
        <>
          <Text style={[s.phaseLabel, { color: modeColor }]}>Memorise the positions!</Text>
          <View style={[s.timerTrack, { backgroundColor: colors.border }]}>
            <View style={[s.timerFill, { width: `${Math.round(timerProgress * 100)}%`, backgroundColor: timerColor }]} />
          </View>
        </>
      )}

      {/* Recall/feedback prompt */}
      {(phase === 'recall' || phase === 'feedback') && currentShape && (
        <>
          <View style={s.promptRow}>
            <Text style={[s.promptText, { color: colors.textMid }]}>Where was the</Text>
            <ShapeSvg type={currentShape.type} color={currentShape.color} size={24} />
            <Text style={[s.promptText, { color: currentShape.color, fontWeight: '700' }]}>{currentShape.colorName} {currentShape.type}</Text>
            <Text style={[s.promptText, { color: colors.textMid }]}>?</Text>
          </View>
          <Text style={[s.shapeCounter, { color: colors.textLight }]}>Shape {shapeIdx + 1}/{shapes.length}</Text>
        </>
      )}

      {/* Round done */}
      {phase === 'round_done' && (
        <Text style={[s.phaseLabel, { color: modeColor }]}>Round {roundIdx + 1} Complete!</Text>
      )}

      {/* Canvas */}
      {phase !== 'round_done' ? (
        <Pressable
          style={[s.canvas, { backgroundColor: colors.card }]}
          onPress={phase === 'recall' ? handleCanvasTap : undefined}
          onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {/* Show all shapes during viewing */}
          {phase === 'viewing' && shapes.map((sh: any, i: number) => (
            <View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -(sh.size ?? 30) / 2 }, { translateY: -(sh.size ?? 30) / 2 }] }}>
              <ShapeSvg type={sh.type} color={sh.color} size={sh.size ?? 30} />
            </View>
          ))}

          {/* Tap result markers */}
          {tapResult && (
            <>
              {/* Connecting line */}
              <Svg style={{ position: 'absolute', top: 0, left: 0, width: canvasSize.w, height: canvasSize.h, pointerEvents: 'none' }}>
                <Line
                  x1={`${tapResult.tapX}%`} y1={`${tapResult.tapY}%`}
                  x2={`${tapResult.actualX}%`} y2={`${tapResult.actualY}%`}
                  stroke={currentShape?.color ?? '#999'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.3}
                />
              </Svg>
              {/* Player tap dot */}
              <View style={{
                position: 'absolute',
                left: `${tapResult.tapX}%`, top: `${tapResult.tapY}%`,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: currentShape?.color ?? '#999',
                transform: [{ translateX: -5 }, { translateY: -5 }],
              }} />
              {/* Actual position dashed circle */}
              <View style={{
                position: 'absolute',
                left: `${tapResult.actualX}%`, top: `${tapResult.actualY}%`,
                width: 28, height: 28, borderRadius: 14,
                borderWidth: 2, borderColor: currentShape?.color ?? '#999',
                borderStyle: 'dashed', opacity: 0.5,
                transform: [{ translateX: -14 }, { translateY: -14 }],
              }} />
            </>
          )}
        </Pressable>
      ) : (
        /* Round score display */
        <View style={s.centered}>
          <Text style={[s.roundScore, { color: colors.text }]}>{lastRoundScore ?? 0}/{shapes.length * 100}</Text>
          <Pressable style={[s.btn, { backgroundColor: modeColor }]} onPress={nextRound}>
            <Text style={s.btnText}>{roundIdx + 1 < totalRounds ? 'Next Round' : 'See Results'}</Text>
          </Pressable>
        </View>
      )}

      {/* Score after tap */}
      {tapResult && (
        <Text style={[s.scoreText, {
          color: tapResult.score >= 80 ? colors.correct : tapResult.score >= 50 ? '#D4A012' : colors.wrong,
        }]}>
          {tapResult.dist}% off — {tapResult.score} pts
        </Text>
      )}

      {/* Shape progress during recall */}
      {(phase === 'recall' || phase === 'feedback') && (
        <View style={s.shapeProgress}>
          {shapes.map((sh: any, i: number) => {
            const isPast = i < shapeIdx || (i === shapeIdx && phase === 'feedback');
            const isCurrent = i === shapeIdx && phase === 'recall';
            return (
              <View key={i} style={[s.shapeDot, {
                backgroundColor: isPast ? `${sh.color}30` : isCurrent ? sh.color : colors.border,
                borderWidth: isCurrent ? 2 : 0, borderColor: sh.color,
              }]}>
                {isPast && shapeScores[i] !== undefined && (
                  <Text style={[s.shapeDotScore, { color: sh.color }]}>{shapeScores[i]}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Round tally dots */}
      <View style={s.scoreRow}>
        {roundScores.map((sc, i) => (
          <View key={i} style={[s.scoreDot, { backgroundColor: sc >= 250 ? colors.correct : sc > 0 ? '#D4A012' : colors.wrong }]}>
            <Text style={s.scoreDotText}>{Math.round(sc / 5)}</Text>
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
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  timerTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginHorizontal: 4 },
  timerFill: { height: '100%', borderRadius: 3 },
  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  promptText: { fontSize: 14 },
  shapeCounter: { fontSize: 11, textAlign: 'center' },
  canvas: { aspectRatio: 1, width: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  scoreText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  shapeProgress: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  shapeDot: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  shapeDotScore: { fontSize: 8, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  roundScore: { fontSize: 42, fontWeight: '900' },
  btn: { paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  scoreDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});
