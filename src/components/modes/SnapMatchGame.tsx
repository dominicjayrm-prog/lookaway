import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
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

type Phase = 'sceneA' | 'blank' | 'sceneB' | 'feedback';

interface Props {
  modeData: any;
  onComplete: (totalScore: number) => void;
  modeColor: string;
}

export default function SnapMatchGame({ modeData, onComplete, modeColor }: Props) {
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
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  // Viewing time per round
  const viewingTimeMs = roundIdx < 2 ? 2500 : roundIdx < 4 ? 2000 : 1500;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Start round — show Scene A with countdown timer
  const startRound = useCallback(() => {
    setLastResult(null);
    setPhase('sceneA');
    setTimerProgress(1);
    setResponseTimer(0);

    const startTime = Date.now();

    // Animate timer bar
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / viewingTimeMs);
      setTimerProgress(remaining);
    }, 50);

    // Transition: sceneA -> blank -> sceneB
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerProgress(0);
      setPhase('blank');
      const inner = setTimeout(() => {
        setPhase('sceneB');
        setResponseStartTime(Date.now());
      }, 800);
      timerRef.current = inner;
    }, viewingTimeMs);
  }, [viewingTimeMs]);

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
    // Use pageX/pageY relative to canvas position for accurate coordinates
    // offsetX/locationX can be relative to child elements (shapes), not the canvas
    const px = nativeEvent.pageX ?? nativeEvent.clientX ?? 0;
    const py = nativeEvent.pageY ?? nativeEvent.clientY ?? 0;
    const lx = px - canvasPos.current.x;
    const ly = py - canvasPos.current.y;
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
      {phase === 'blank' && <Text style={[s.phaseLabel, { color: colors.textMid }]}>Get ready...</Text>}
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
          setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
          // Measure canvas position on screen for accurate tap coordinates
          (canvasRef.current as any)?.measureInWindow?.((x: number, y: number) => { canvasPos.current = { x, y }; });
        }}
      >
        {phase === 'sceneA' && renderScene(round.sceneA)}
        {phase === 'sceneB' && renderScene(round.sceneB)}
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
