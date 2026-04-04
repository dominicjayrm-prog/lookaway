import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { CAMPAIGNS } from '@/src/data/campaigns';
import { CHALLENGE_MODES, getScorePercentage, getMaxScore } from '@/src/data/challengeModes';
import { generateSideCampaignData } from '@/src/utils/sideCampaignGenerators';
import SnapMatchGame from '@/src/components/modes/SnapMatchGame';
import SequenceGame from '@/src/components/modes/SequenceGame';
import CountingBlitzGame from '@/src/components/modes/CountingBlitzGame';
import ColourChainGame from '@/src/components/modes/ColourChainGame';

type Phase = 'loading' | 'ready' | 'show' | 'recall' | 'feedback' | 'round_done' | 'complete' | 'failed' | 'error';

function ShapeSvg({ type, color, size }: { type: string; color: string; size: number }) {
  switch (type) {
    case 'circle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
    case 'square': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={20} height={20} rx={3} fill={color} /></Svg>;
    case 'triangle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,20 2,20" fill={color} /></Svg>;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,12 12,22 2,12" fill={color} /></Svg>;
    case 'hexagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 21.66,7 21.66,17 12,22 2.34,17 2.34,7" fill={color} /></Svg>;
    case 'pentagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22.47,9.51 18.54,21.49 5.46,21.49 1.53,9.51" fill={color} /></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
  }
}

function getStarsForScore(pct: number): number {
  if (pct >= 90) return 3;
  if (pct >= 70) return 2;
  if (pct >= 50) return 1;
  return 0;
}

export default function SideCampaignScreen() {
  const { levelId, mode, worldNumber, levelNumber, worldName } = useLocalSearchParams<{
    levelId: string; mode: string; worldNumber: string; levelNumber: string; worldName: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { addGems, loseLife, addStars } = useGameStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [modeData, setModeData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [scorePct, setScorePct] = useState(0);
  const [stars, setStarsState] = useState(0);
  const [gemsEarned, setGemsEarned] = useState(0);

  // Speed recall inline state
  const [roundIdx, setRoundIdx] = useState(0);
  const [shapeIdx, setShapeIdx] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [shapeScores, setShapeScores] = useState<number[]>([]);
  const [tapResult, setTapResult] = useState<{ tapX: number; tapY: number; actualX: number; actualY: number; score: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });

  const modeConfig = CHALLENGE_MODES[mode ?? ''];
  const campaignConfig = CAMPAIGNS[mode ?? ''];
  const mColor = modeConfig?.color ?? campaignConfig?.color ?? '#6C5CE7';

  // Load level from Supabase
  useEffect(() => {
    if (!levelId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('side_campaign_levels')
          .select('*')
          .eq('id', levelId)
          .single();
        if (cancelled) return;
        if (error || !data) { setPhase('error'); return; }
        setLevelData(data.level_data);
        const generated = generateSideCampaignData(data.mode, data.level_data);
        setModeData(generated);
        setPhase('ready');
      } catch { if (!cancelled) setPhase('error'); }
    })();
    return () => { cancelled = true; };
  }, [levelId]);

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const isExternalMode = mode && ['snap_match', 'sequence', 'counting_blitz', 'colour_chain'].includes(mode);

  // ─── SPEED RECALL (inline) ───
  const currentRound = modeData?.rounds?.[roundIdx];
  const currentShape = currentRound?.shapes?.[shapeIdx];
  const viewingTime = (modeData?.viewingTime ?? levelData?.viewingTime ?? 3) * 1000;

  const startRound = useCallback(() => {
    setShapeIdx(0);
    setShapeScores([]);
    setTapResult(null);
    setPhase('show');
    timerRef.current = setTimeout(() => setPhase('recall'), viewingTime);
  }, [viewingTime]);

  const handleCanvasTap = useCallback((e: any) => {
    if (phase !== 'recall' || !currentShape) return;
    const { locationX, locationY } = e.nativeEvent;
    const tapX = (locationX / canvasSize.w) * 100;
    const tapY = (locationY / canvasSize.h) * 100;
    const dist = Math.sqrt((tapX - currentShape.x) ** 2 + (tapY - currentShape.y) ** 2);
    const score = Math.max(0, Math.round(100 - dist * 2));

    setTapResult({ tapX, tapY, actualX: currentShape.x, actualY: currentShape.y, score });
    setShapeScores(prev => [...prev, score]);
    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      setTapResult(null);
      if (shapeIdx + 1 < (currentRound?.shapes?.length ?? 0)) {
        setShapeIdx(prev => prev + 1);
        setPhase('recall');
      } else {
        const roundTotal = [...shapeScores, score].reduce((a, b) => a + b, 0);
        setRoundScores(prev => [...prev, roundTotal]);
        setPhase('round_done');
      }
    }, 1200);
  }, [phase, currentShape, shapeIdx, currentRound, shapeScores, canvasSize]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < (modeData?.rounds?.length ?? 0)) {
      setRoundIdx(prev => prev + 1);
      startRound();
    } else {
      const total = roundScores.reduce((a, b) => a + b, 0);
      finishLevel(total);
    }
  }, [roundIdx, modeData, roundScores]);

  // ─── COMPLETION HANDLER ───
  const finishLevel = useCallback(async (rawScore: number) => {
    const pct = getScorePercentage(mode ?? 'speed_recall', rawScore);
    const earnedStars = getStarsForScore(pct);
    setTotalScore(rawScore);
    setScorePct(pct);
    setStarsState(earnedStars);

    // Gem rewards based on stars
    const gemRewards: Record<number, number> = { 0: 0, 1: 5, 2: 10, 3: 20 };
    const gems = gemRewards[earnedStars] ?? 0;
    setGemsEarned(gems);

    if (gems > 0) addGems(gems);
    if (earnedStars > 0) addStars(earnedStars);

    // Save progress to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId && levelId) {
        await supabase.from('side_campaign_progress').upsert({
          user_id: userId,
          level_id: levelId,
          stars: earnedStars,
          best_score: pct,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,level_id' });
      }
    } catch (e) {
      console.warn('Failed to save side campaign progress:', e);
    }

    if (pct >= 50) {
      setPhase('complete');
    } else {
      loseLife();
      setPhase('failed');
    }
  }, [mode, levelId, addGems, addStars, loseLife]);

  const handleModeComplete = useCallback((rawScore: number) => {
    finishLevel(rawScore);
  }, [finishLevel]);

  // ─── Navigate to next level ───
  const goToNextLevel = useCallback(() => {
    const wNum = parseInt(worldNumber ?? '1');
    const lNum = parseInt(levelNumber ?? '1');
    const nextLevelNum = lNum + 1;
    const prefix = mode === 'speed_recall' ? 'sr' : mode === 'snap_match' ? 'sm' : mode === 'sequence' ? 'seq' : mode === 'counting_blitz' ? 'cb' : 'cc';
    const nextId = `${prefix}_w${wNum}_l${nextLevelNum}`;
    router.replace({
      pathname: '/game/side-campaign',
      params: { levelId: nextId, mode: mode ?? '', worldNumber: worldNumber ?? '1', levelNumber: String(nextLevelNum), worldName: worldName ?? '' },
    });
  }, [mode, worldNumber, levelNumber, worldName, router]);

  // ─── RENDER ───
  if (phase === 'loading') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <Text style={[s.loadingText, { color: colors.textMid }]}>Loading level...</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <Text style={[s.loadingText, { color: colors.wrong }]}>Could not load level</Text>
        <Pressable style={[s.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={s.btnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.closeX, { color: colors.textMid }]}>{'\u2715'}</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: mColor }]}>{worldName}</Text>
          <Text style={[s.headerSub, { color: colors.textMid }]}>Level {levelNumber}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Ready */}
      {phase === 'ready' && (
        <View style={s.centered}>
          <View style={[s.modeBadge, { backgroundColor: mColor + '15' }]}>
            <Text style={[s.modeBadgeText, { color: mColor }]}>{modeConfig?.name ?? mode}</Text>
          </View>
          <Text style={[s.bigTitle, { color: colors.text }]}>Level {levelNumber}</Text>
          <Text style={[s.subtitle, { color: colors.textMid }]}>{worldName}</Text>
          <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => {
            if (isExternalMode) setPhase('show');
            else startRound();
          }}>
            <Text style={s.btnText}>Start</Text>
          </Pressable>
        </View>
      )}

      {/* External mode games */}
      {phase === 'show' && isExternalMode && modeData && (
        <>
          {mode === 'snap_match' && <SnapMatchGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} />}
          {mode === 'sequence' && <SequenceGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} />}
          {mode === 'counting_blitz' && <CountingBlitzGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} />}
          {mode === 'colour_chain' && <ColourChainGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} />}
        </>
      )}

      {/* SPEED RECALL: Show scene */}
      {phase === 'show' && !isExternalMode && currentRound && (
        <View style={s.gameArea}>
          <Text style={[s.phaseLabel, { color: colors.textMid }]}>Memorise the positions!</Text>
          <View style={[s.canvas, { backgroundColor: colors.card }]} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {currentRound.shapes.map((sh: any, i: number) => (
              <View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sh.size / 2 }, { translateY: -sh.size / 2 }] }}>
                <ShapeSvg type={sh.type} color={sh.color} size={sh.size} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* SPEED RECALL: Recall / Feedback */}
      {(phase === 'recall' || phase === 'feedback') && !isExternalMode && currentShape && (
        <View style={s.gameArea}>
          <View style={s.promptRow}>
            <ShapeSvg type={currentShape.type} color={currentShape.color} size={24} />
            <Text style={[s.promptText, { color: colors.text }]}>Where was the {currentShape.colorName} {currentShape.type}?</Text>
          </View>
          <Text style={[s.shapeProgress, { color: colors.textLight }]}>Shape {shapeIdx + 1}/{currentRound.shapes.length}</Text>
          <Pressable style={[s.canvas, { backgroundColor: colors.card }]} onPress={handleCanvasTap} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {tapResult && (
              <>
                <View style={{ position: 'absolute', left: `${tapResult.tapX}%`, top: `${tapResult.tapY}%`, width: 12, height: 12, borderRadius: 6, backgroundColor: currentShape.color, transform: [{ translateX: -6 }, { translateY: -6 }] }} />
                <View style={{ position: 'absolute', left: `${tapResult.actualX}%`, top: `${tapResult.actualY}%`, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.correct, borderStyle: 'dashed', transform: [{ translateX: -12 }, { translateY: -12 }] }} />
                <View style={{ position: 'absolute', left: `${(tapResult.tapX + tapResult.actualX) / 2}%`, top: `${Math.min(tapResult.tapY, tapResult.actualY) - 5}%`, transform: [{ translateX: -20 }] }}>
                  <Text style={[s.feedbackScore, { color: tapResult.score >= 70 ? colors.correct : tapResult.score >= 40 ? colors.gold : colors.wrong }]}>{tapResult.score} pts</Text>
                </View>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Round done (speed recall only) */}
      {phase === 'round_done' && !isExternalMode && (
        <View style={s.centered}>
          <Text style={[s.roundDoneTitle, { color: mColor }]}>Round {roundIdx + 1} Complete!</Text>
          <Text style={[s.roundDoneScore, { color: colors.text }]}>{roundScores[roundScores.length - 1]}/500</Text>
          <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={nextRound}>
            <Text style={s.btnText}>{roundIdx + 1 < (modeData?.rounds?.length ?? 5) ? 'Next Round' : 'See Results'}</Text>
          </Pressable>
        </View>
      )}

      {/* Level Complete */}
      {phase === 'complete' && (
        <View style={s.centered}>
          <Text style={[s.bigTitle, { color: mColor }]}>Level Complete!</Text>
          <Text style={[s.bigScore, { color: colors.text }]}>{scorePct}%</Text>
          <View style={s.starRow}>
            {[1, 2, 3].map(i => (
              <Text key={i} style={[s.star, { color: i <= stars ? colors.gold : colors.border }]}>{'\u2605'}</Text>
            ))}
          </View>
          {gemsEarned > 0 && (
            <Text style={[s.gemsText, { color: colors.gold }]}>+{gemsEarned} gems</Text>
          )}
          <View style={s.buttonRow}>
            <Pressable style={[s.btn, s.btnSecondary, { borderColor: mColor }]} onPress={() => router.back()}>
              <Text style={[s.btnTextSecondary, { color: mColor }]}>Back to map</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={goToNextLevel}>
              <Text style={s.btnText}>Next Level</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Level Failed */}
      {phase === 'failed' && (
        <View style={s.centered}>
          <Text style={[s.bigTitle, { color: colors.wrong }]}>Not Quite!</Text>
          <Text style={[s.bigScore, { color: colors.text }]}>{scorePct}%</Text>
          <Text style={[s.subtitle, { color: colors.textMid }]}>You need 50% to pass</Text>
          <View style={s.buttonRow}>
            <Pressable style={[s.btn, s.btnSecondary, { borderColor: colors.textMid }]} onPress={() => router.back()}>
              <Text style={[s.btnTextSecondary, { color: colors.textMid }]}>Back to map</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => {
              // Retry — regenerate data
              if (levelData && mode) {
                const regenerated = generateSideCampaignData(mode, levelData);
                setModeData(regenerated);
                setTotalScore(0);
                setScorePct(0);
                setStarsState(0);
                setRoundIdx(0);
                setRoundScores([]);
                setPhase('ready');
              }
            }}>
              <Text style={s.btnText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  closeBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 20 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  gameArea: { flex: 1, gap: 10 },
  modeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  modeBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  bigTitle: { fontSize: 28, fontWeight: '800' },
  bigScore: { fontSize: 56, fontWeight: '900' },
  subtitle: { fontSize: 15 },
  btn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', minWidth: 140 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2 },
  btnTextSecondary: { fontSize: 17, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  loadingText: { fontSize: 15, textAlign: 'center', marginTop: 20 },
  phaseLabel: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  canvas: { flex: 1, borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  promptText: { fontSize: 15, fontWeight: '600' },
  shapeProgress: { fontSize: 12, textAlign: 'center' },
  feedbackScore: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  roundDoneTitle: { fontSize: 22, fontWeight: '700' },
  roundDoneScore: { fontSize: 42, fontWeight: '900' },
  starRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 36 },
  gemsText: { fontSize: 18, fontWeight: '700' },
});
