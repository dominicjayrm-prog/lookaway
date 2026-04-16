import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polygon, Line } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { CHALLENGE_MODES, getScorePercentage } from '@/src/data/challengeModes';
import { generateSpeedRecallData, generateSnapMatchData, generateSequenceData, generateCountingBlitzData, generateColourChainData } from '@/src/utils/modeGenerators';
import { createChallenge, recordChallengeScore, abandonChallenge } from '@/src/utils/challengeFlow';
import { notifyChallengeReceived } from '@/src/utils/notifications';
import { checkAchievements } from '@/src/utils/achievements';
import { recordFriendChallengedForChallenges } from '@/src/utils/weeklyChallenges';
import { logActivity } from '@/src/utils/activity';
import SnapMatchGame from '@/src/components/modes/SnapMatchGame';
import SequenceGame from '@/src/components/modes/SequenceGame';
import CountingBlitzGame from '@/src/components/modes/CountingBlitzGame';
import ColourChainGame from '@/src/components/modes/ColourChainGame';
import SpeedRecallGame from '@/src/components/modes/SpeedRecallGame';
import { QuitConfirmModal } from '@/src/components/QuitConfirmModal';
import { CHALLENGE_VIEW_TIME_MULT } from '@/src/utils/challengeTiming';

type Phase = 'loading' | 'ready' | 'show' | 'recall' | 'feedback' | 'round_done' | 'complete' | 'error';

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

function ChallengeModeScreen() {
  const { mode, friendId, action, challengeId } = useLocalSearchParams<{ mode: string; friendId?: string; action?: string; challengeId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const modeConfig = CHALLENGE_MODES[mode ?? 'classic'];

  const [phase, setPhase] = useState<Phase>('loading');
  const [modeData, setModeData] = useState<any>(null);
  const [dbChallengeId, setDbChallengeId] = useState<string | null>(challengeId ?? null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [roundIdx, setRoundIdx] = useState(0);
  const [shapeIdx, setShapeIdx] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [shapeScores, setShapeScores] = useState<number[]>([]);
  const [tapResult, setTapResult] = useState<{ tapX: number; tapY: number; actualX: number; actualY: number; score: number } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        if (action === 'create' && friendId) {
          let data: any;
          switch (mode) {
            case 'speed_recall': data = generateSpeedRecallData(); break;
            case 'snap_match': data = generateSnapMatchData(); break;
            case 'sequence': data = generateSequenceData(); break;
            case 'counting_blitz': data = generateCountingBlitzData(); break;
            case 'colour_chain': data = generateColourChainData(); break;
            default: data = {};
          }
          if (cancelled) return;
          setModeData(data);
          setPhase('ready');
        } else if (challengeId) {
          const { data: ch } = await supabase.from('friend_challenges').select('mode_data').eq('id', challengeId).single();
          if (cancelled) return;
          if (ch?.mode_data) { setModeData(ch.mode_data); setPhase('ready'); }
          else setPhase('error');
        } else { setPhase('error'); }
      } catch { if (!cancelled) setPhase('error'); }
    })();
    return () => { cancelled = true; };
  }, [userId, mode, action, friendId, challengeId]);

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const currentRound = modeData?.rounds?.[roundIdx];
  const currentShape = currentRound?.shapes?.[shapeIdx];

  const startRound = useCallback(() => {
    setShapeIdx(0); setShapeScores([]); setTapResult(null); setPhase('show');
    timerRef.current = setTimeout(() => setPhase('recall'), 3000);
  }, []);

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
      if (shapeIdx + 1 < (currentRound?.shapes?.length ?? 0)) { setShapeIdx(prev => prev + 1); setPhase('recall'); }
      else { const roundTotal = [...shapeScores, score].reduce((a, b) => a + b, 0); setRoundScores(prev => [...prev, roundTotal]); setPhase('round_done'); }
    }, 1200);
  }, [phase, currentShape, shapeIdx, currentRound, shapeScores, canvasSize]);

  /** After a score is submitted to a challenge row, route to the
   *  result screen which handles the "hide until both finish"
   *  behaviour. Small delay so the local score animation has a
   *  moment to play before we navigate. */
  const routeToResult = useCallback((challengeId: string) => {
    setTimeout(() => router.replace({ pathname: '/game/challenge-result', params: { challengeId } }), 400);
  }, [router]);

  const nextRound = useCallback(() => {
    if (roundIdx + 1 < (modeData?.rounds?.length ?? 0)) { setRoundIdx(prev => prev + 1); startRound(); }
    else {
      const total = roundScores.reduce((a, b) => a + b, 0);
      setTotalScore(total); setPhase('complete');
      // Log to recent activity feed so the home screen surfaces it
      const totalPct = getScorePercentage(mode ?? 'speed_recall', total);
      logActivity('mode_complete', { mode, modeName: modeConfig?.name ?? mode, score: total, scorePct: totalPct });
      if (dbChallengeId && userId) {
        recordChallengeScore(dbChallengeId, userId, totalPct, 0).then(() => routeToResult(dbChallengeId));
      } else if (action === 'create' && friendId && userId) {
        (async () => {
          const { data: inserted } = await supabase.from('friend_challenges').insert({ challenger_id: userId, challenged_id: friendId, level_ids: [], mode: mode, mode_data: modeData, challenger_score: getScorePercentage(mode ?? 'speed_recall', total), status: 'pending' }).select('id').single();
          if (inserted?.id) {
            setDbChallengeId(inserted.id);
            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            if (myProfile?.username) { notifyChallengeReceived(friendId, myProfile.username, modeConfig?.name ?? 'a challenge', inserted.id); }
            const { count } = await supabase.from('friend_challenges').select('id', { count: 'exact', head: true }).eq('challenger_id', userId);
            checkAchievements(userId, { type: 'challenge_sent', data: { totalChallengesSent: count ?? 0 } }).catch(() => {});
            // Weekly challenge tracker — counts toward the "challenge a
            // friend" engagement goal when it's active this week.
            recordFriendChallengedForChallenges().catch(() => {});
            routeToResult(inserted.id);
          }
        })();
      }
    }
  }, [roundIdx, modeData, roundScores, dbChallengeId, userId, mode, action, friendId, routeToResult]);

  const handleModeComplete = useCallback((rawScore: number) => {
    const pct = getScorePercentage(mode ?? 'classic', rawScore);
    setTotalScore(rawScore); setPhase('complete');
    // Log to recent activity feed so the home screen surfaces it
    logActivity('mode_complete', { mode, modeName: modeConfig?.name ?? mode, score: rawScore, scorePct: pct });
    if (dbChallengeId && userId) {
      recordChallengeScore(dbChallengeId, userId, pct, 0).then(() => routeToResult(dbChallengeId));
    } else if (action === 'create' && friendId && userId) {
      (async () => {
        const { data: inserted } = await supabase.from('friend_challenges').insert({ challenger_id: userId, challenged_id: friendId, level_ids: [], mode, mode_data: modeData, challenger_score: pct, status: 'pending' }).select('id').single();
        if (inserted?.id) {
            setDbChallengeId(inserted.id);
            const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', userId).single();
            if (myProfile?.username) { notifyChallengeReceived(friendId, myProfile.username, modeConfig?.name ?? 'a challenge', inserted.id); }
            const { count } = await supabase.from('friend_challenges').select('id', { count: 'exact', head: true }).eq('challenger_id', userId);
            checkAchievements(userId, { type: 'challenge_sent', data: { totalChallengesSent: count ?? 0 } }).catch(() => {});
            // Weekly challenge tracker — counts toward the "challenge a
            // friend" engagement goal when it's active this week.
            recordFriendChallengedForChallenges().catch(() => {});
            routeToResult(inserted.id);
          }
      })();
    }
  }, [mode, dbChallengeId, userId, action, friendId, modeData, routeToResult]);

  const isExternalMode = mode && ['speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'].includes(mode);

  if (phase === 'loading') return <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}><Text style={[s.loadingText, { color: colors.textMid }]}>Loading {modeConfig?.name}...</Text></SafeAreaView>;
  if (phase === 'error') return <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}><Text style={[s.loadingText, { color: colors.wrong }]}>Could not load challenge</Text><Pressable style={[s.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}><Text style={s.btnText}>Go back</Text></Pressable></SafeAreaView>;

  const mColor = modeConfig?.color ?? '#6C5CE7';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable
          onPress={() => {
            // Skip the confirmation when nothing is at stake. Loading
            // and error phases short-circuit earlier in the render and
            // never reach this button — only the `complete` phase is
            // reachable here as a no-confirmation exit.
            if (phase === 'complete') {
              router.back();
              return;
            }
            // Styled modal instead of iOS Alert so premium users see
            // the same "Are you sure?" copy they get on campaign.
            setShowQuitConfirm(true);
          }}
          style={s.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        ><Text style={[s.closeX, { color: colors.textMid }]}>{'\u2715'}</Text></Pressable>
        <Text style={[s.headerTitle, { color: mColor }]}>{modeConfig?.name}</Text>
        <Text style={[s.headerRound, { color: colors.textMid }]}>Round {roundIdx + 1}/{modeData?.rounds?.length ?? 5}</Text>
      </View>
      <View style={s.progressRow}>{Array.from({ length: modeData?.rounds?.length ?? 5 }).map((_, i) => (<View key={i} style={[s.progressSeg, { backgroundColor: i <= roundIdx ? mColor : colors.border }]} />))}</View>

      {phase === 'ready' && (<View style={s.centered}><Text style={[s.bigTitle, { color: mColor }]}>{modeConfig?.name}</Text><Text style={[s.subtitle, { color: colors.textMid }]}>{modeConfig?.roundLabel} · {modeConfig?.estimatedTime}</Text><Text style={[s.howItWorks, { color: colors.textMid }]}>{modeConfig?.howItWorks}</Text><Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={() => { if (isExternalMode) setPhase('show'); else startRound(); }}><Text style={s.btnText}>Start</Text></Pressable></View>)}

      {phase === 'show' && isExternalMode && modeData && (<>
        {/* `viewTimeMultiplier` is the shared challenge-mode buffer
            (see `src/utils/challengeTiming.ts`). Each mode that has
            a viewing / chaos / memorise phase takes it and stretches
            that phase by 1.3x — matching the Classic challenge
            timer fix. Sequence is turn-based with no viewing
            timer, so it doesn't take the prop. */}
        {/* onRoundChange keeps the external "Round X/5" header in the
            top-right in sync with each mode's internal round state.
            Without it the header stuck at "Round 1/5" through the
            whole match since the embedded mode owns its own counter. */}
        {mode === 'speed_recall' && <SpeedRecallGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} viewTimeMultiplier={CHALLENGE_VIEW_TIME_MULT} onRoundChange={setRoundIdx} />}
        {mode === 'snap_match' && <SnapMatchGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} viewTimeMultiplier={CHALLENGE_VIEW_TIME_MULT} onRoundChange={setRoundIdx} />}
        {mode === 'sequence' && <SequenceGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} onRoundChange={setRoundIdx} />}
        {mode === 'counting_blitz' && <CountingBlitzGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} viewTimeMultiplier={CHALLENGE_VIEW_TIME_MULT} onRoundChange={setRoundIdx} />}
        {mode === 'colour_chain' && <ColourChainGame modeData={modeData} onComplete={handleModeComplete} modeColor={mColor} viewTimeMultiplier={CHALLENGE_VIEW_TIME_MULT} onRoundChange={setRoundIdx} />}
      </>)}

      {phase === 'show' && !isExternalMode && currentRound && (<View style={s.gameArea}><Text style={[s.phaseLabel, { color: colors.textMid }]}>Memorise the positions!</Text><View style={[s.canvas, { backgroundColor: colors.card }]} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>{currentRound.shapes.map((sh: any, i: number) => (<View key={i} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: [{ translateX: -sh.size / 2 }, { translateY: -sh.size / 2 }] }}><ShapeSvg type={sh.type} color={sh.color} size={sh.size} /></View>))}</View></View>)}

      {(phase === 'recall' || phase === 'feedback') && !isExternalMode && currentShape && (<View style={s.gameArea}><View style={s.promptRow}><ShapeSvg type={currentShape.type} color={currentShape.color} size={24} /><Text style={[s.promptText, { color: colors.text }]}>Where was the {currentShape.colorName} {currentShape.type}?</Text></View><Text style={[s.shapeProgress, { color: colors.textLight }]}>Shape {shapeIdx + 1}/{currentRound.shapes.length}</Text><Pressable style={[s.canvas, { backgroundColor: colors.card }]} onPress={handleCanvasTap} onLayout={(e) => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>{tapResult && (<><View style={{ position: 'absolute', left: `${tapResult.tapX}%`, top: `${tapResult.tapY}%`, width: 12, height: 12, borderRadius: 6, backgroundColor: currentShape.color, transform: [{ translateX: -6 }, { translateY: -6 }] }} /><View style={{ position: 'absolute', left: `${tapResult.actualX}%`, top: `${tapResult.actualY}%`, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.correct, borderStyle: 'dashed', transform: [{ translateX: -12 }, { translateY: -12 }] }} /><View style={{ position: 'absolute', left: `${(tapResult.tapX + tapResult.actualX) / 2}%`, top: `${Math.min(tapResult.tapY, tapResult.actualY) - 5}%`, transform: [{ translateX: -20 }] }}><Text style={[s.feedbackScore, { color: tapResult.score >= 70 ? colors.correct : tapResult.score >= 40 ? colors.gold : colors.wrong }]}>{tapResult.score} pts</Text></View></>)}</Pressable></View>)}

      {phase === 'round_done' && !isExternalMode && (<View style={s.centered}><Text style={[s.roundDoneTitle, { color: mColor }]}>Round {roundIdx + 1} Complete!</Text><Text style={[s.roundDoneScore, { color: colors.text }]}>{roundScores[roundScores.length - 1]}/500</Text><Pressable style={[s.btn, { backgroundColor: mColor }]} onPress={nextRound}><Text style={s.btnText}>{roundIdx + 1 < (modeData?.rounds?.length ?? 5) ? 'Next Round' : 'See Results'}</Text></Pressable></View>)}

      {phase === 'complete' && (<View style={s.centered}><Text style={[s.bigTitle, { color: mColor }]}>Challenge Complete!</Text><Text style={[s.bigScore, { color: colors.text }]}>{getScorePercentage(mode ?? 'speed_recall', totalScore)}%</Text><Text style={[s.subtitle, { color: colors.textMid }]}>{totalScore} / {(modeData?.rounds?.length ?? 5) * 500} points</Text>{action === 'create' && <Text style={[s.sentText, { color: colors.correct }]}>Challenge sent! Waiting for your friend.</Text>}<Pressable style={[s.btn, { backgroundColor: mColor, marginTop: 20 }]} onPress={() => router.replace('/(tabs)/friends')}><Text style={s.btnText}>Back to friends</Text></Pressable></View>)}

      <QuitConfirmModal
        visible={showQuitConfirm}
        costsLife={false}
        nonPremiumBody={action === 'create'
          ? "Your progress will be lost and no challenge will be sent to your friend."
          : "Your progress will be lost. You can come back later as long as the challenge is still pending."}
        onLeave={() => {
          setShowQuitConfirm(false);
          // Live-challenge abandonment — flip the row to 'abandoned'
          // so the opponent's result screen breaks out of its
          // waiting state with a "they left the match" terminal
          // view. Only when the row already exists (live invite
          // path). Fire-and-forget.
          if (dbChallengeId && userId) {
            abandonChallenge(dbChallengeId, userId).catch(() => {});
          }
          router.back();
        }}
        onKeepPlaying={() => setShowQuitConfirm(false)}
      />
    </SafeAreaView>
  );
}

export default ChallengeModeScreen;

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  closeBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerRound: { fontSize: 13 },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  gameArea: { flex: 1, gap: 10 },
  bigTitle: { fontSize: 28, fontWeight: '800' },
  bigScore: { fontSize: 56, fontWeight: '900' },
  subtitle: { fontSize: 15 },
  howItWorks: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  btn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, alignItems: 'center', minWidth: 200 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  loadingText: { fontSize: 15, textAlign: 'center', marginTop: 20 },
  phaseLabel: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  canvas: { flex: 1, borderRadius: 16, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  promptText: { fontSize: 15, fontWeight: '600' },
  shapeProgress: { fontSize: 12, textAlign: 'center' },
  feedbackScore: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  roundDoneTitle: { fontSize: 22, fontWeight: '700' },
  roundDoneScore: { fontSize: 42, fontWeight: '900' },
  sentText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
