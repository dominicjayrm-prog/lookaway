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

type Phase = 'sceneA' | 'blank' | 'sceneB' | 'feedback' | 'round_done';

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
  const [lastResult, setLastResult] = useState<{ correct: boolean; score: number; description: string } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const round = modeData?.rounds?.[roundIdx];
  const totalRounds = modeData?.rounds?.length ?? 5;

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  // Start Scene A display
  const startRound = useCallback(() => {
    setLastResult(null);
    setPhase('sceneA');
    timerRef.current = setTimeout(() => {
      setPhase('blank');
      timerRef.current = setTimeout(() => {
        setPhase('sceneB');
        setResponseStartTime(Date.now());
      }, 800);
    }, 2500);
  }, []);

  // Auto-start first round
  useEffect(() => { startRound(); }, [roundIdx]);

  const handleTapSceneB = useCallback((tapX: number, tapY: number) => {
    if (phase !== 'sceneB' || !round) return;
    const elapsed = Date.now() - responseStartTime;

    const { changeType, targetIndex, sceneB, sceneA, removedShape, description } = round;
    let correct = false;
    const hitRadius = 12; // percentage points tolerance

    if (changeType === 'removed' && removedShape) {
      // Check if tap is near the removed shape's position
      const dist = Math.sqrt((tapX - removedShape.x) ** 2 + (tapY - removedShape.y) ** 2);
      correct = dist < hitRadius;
    } else {
      // Check if tap is near the target shape in Scene B
      const target = sceneB[targetIndex];
      if (target) {
        const dist = Math.sqrt((tapX - target.x) ** 2 + (tapY - target.y) ** 2);
        correct = dist < hitRadius;
      }
    }

    const score = correct ? Math.max(10, Math.round(100 - (elapsed / 1000) * 10)) : 0;
    setLastResult({ correct, score, description });
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
    const { locationX, locationY } = e.nativeEvent;
    const tapX = (locationX / canvasSize.w) * 100;
    const tapY = (locationY / canvasSize.h) * 100;
    handleTapSceneB(tapX, tapY);
  }, [handleTapSceneB, canvasSize]);

  const renderScene = (shapes: any[]) => (
    <>
      {shapes.map((sh: any, i: number) => (
        <View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -(sh.size ?? 30) / 2 }, { translateY: -(sh.size ?? 30) / 2 }] }}>
          <ShapeSvg type={sh.type} color={sh.color} size={sh.size ?? 30} />
        </View>
      ))}
    </>
  );

  if (!round) return null;

  const changeTypeLabel = ['Colour change', 'Position shift', 'Shape added', 'Shape removed', 'Shape type change'][roundIdx % 5] ?? '';

  return (
    <View style={s.container}>
      {/* Phase labels */}
      {phase === 'sceneA' && <Text style={[s.phaseLabel, { color: modeColor }]}>SCENE A — Memorise!</Text>}
      {phase === 'blank' && <Text style={[s.phaseLabel, { color: colors.textMid }]}>Get ready...</Text>}
      {phase === 'sceneB' && <Text style={[s.phaseLabel, { color: modeColor }]}>SCENE B — What changed?</Text>}
      {phase === 'feedback' && lastResult && (
        <Text style={[s.phaseLabel, { color: lastResult.correct ? colors.correct : colors.wrong }]}>
          {lastResult.correct ? `Correct! ${lastResult.score} pts` : 'Wrong!'}
        </Text>
      )}

      <Text style={[s.hint, { color: colors.textLight }]}>{changeTypeLabel}</Text>

      {/* Canvas */}
      <Pressable
        style={[s.canvas, { backgroundColor: colors.card }]}
        onPress={phase === 'sceneB' ? handleCanvasPress : undefined}
        onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {phase === 'sceneA' && renderScene(round.sceneA)}
        {phase === 'sceneB' && renderScene(round.sceneB)}
        {phase === 'feedback' && renderScene(round.sceneB)}
        {phase === 'blank' && <View style={s.blankOverlay}><Text style={[s.blankText, { color: colors.textLight }]}>...</Text></View>}
      </Pressable>

      {/* Feedback description */}
      {phase === 'feedback' && lastResult && (
        <Text style={[s.description, { color: colors.textMid }]}>{round.description}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  phaseLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 11, textAlign: 'center' },
  canvas: { flex: 1, borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  blankOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blankText: { fontSize: 28 },
  description: { fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
