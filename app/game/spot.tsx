import React, { useReducer, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, GestureResponderEvent, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { CountdownTimer } from '@/src/components/CountdownTimer';
import { Button } from '@/src/components/Button';
import { Badge } from '@/src/components/Badge';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import { generateSpotTheChangeChallenge } from '@/src/utils/spotTheChangeChallenge';
import { getTodayDateString } from '@/src/utils/dateHelpers';
import { logActivity } from '@/src/utils/activity';

const isWeb = Platform.OS === 'web';

type Phase = 'READY'|'SHOW_ORIGINAL'|'BLANK'|'SHOW_MODIFIED'|'FEEDBACK'|'COMPLETE';
interface RoundResult { correct: boolean; timeMs: number; }
interface State { phase: Phase; roundIndex: number; results: RoundResult[]; tapCorrect: boolean|null; modifiedShownAt: number; cardW: number; cardH: number; }
type Action = {type:'START'}|{type:'SHOW_BLANK'}|{type:'SHOW_MODIFIED'}|{type:'TAP';correct:boolean;timeMs:number}|{type:'NEXT_ROUND'}|{type:'FINISH'}|{type:'LAYOUT';w:number;h:number};

function reducer(s: State, a: Action): State {
  switch(a.type) {
    case 'START': return {...s, phase:'SHOW_ORIGINAL', roundIndex:0, results:[], tapCorrect:null};
    case 'SHOW_BLANK': return {...s, phase:'BLANK'};
    case 'SHOW_MODIFIED': return {...s, phase:'SHOW_MODIFIED', modifiedShownAt:Date.now(), tapCorrect:null};
    case 'TAP': return {...s, phase:'FEEDBACK', tapCorrect:a.correct, results:[...s.results,{correct:a.correct,timeMs:a.timeMs}]};
    case 'NEXT_ROUND': return s.roundIndex>=4?{...s,phase:'COMPLETE'}:{...s,phase:'SHOW_ORIGINAL',roundIndex:s.roundIndex+1,tapCorrect:null};
    case 'FINISH': return {...s, phase:'COMPLETE'};
    case 'LAYOUT': return {...s, cardW:a.w, cardH:a.h};
    default: return s;
  }
}

function SpotGameScreen() {
  const { colors: tc } = useTheme();
  const router = useRouter();
  const dateStr = getTodayDateString();
  const challenge = useMemo(() => generateSpotTheChangeChallenge(dateStr), [dateStr]);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const mag = String.fromCodePoint(0x1F50D);

  const loseLife = useGameStore((s) => s.loseLife);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [state, dispatch] = useReducer(reducer, { phase:'READY', roundIndex:0, results:[], tapCorrect:null, modifiedShownAt:0, cardW:300, cardH:300 });
  const round = challenge.rounds[state.roundIndex] ?? null;

  const clearTimer = useCallback(() => { if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;} }, []);
  useEffect(() => { return clearTimer; }, [clearTimer]);

  const handleOriginalComplete = useCallback(() => { dispatch({type:'SHOW_BLANK'}); clearTimer(); timerRef.current=setTimeout(()=>dispatch({type:'SHOW_MODIFIED'}),2000); }, [clearTimer]);

  const handleTap = useCallback((e: GestureResponderEvent) => {
    if(state.phase!=='SHOW_MODIFIED') return;
    if(!round?.change?.targetArea) return;
    const {locationX, locationY} = e.nativeEvent;
    const tapX = (locationX/state.cardW)*100;
    const tapY = (locationY/state.cardH)*100;
    const {x,y,radius} = round.change.targetArea;
    const dist = Math.hypot(tapX-x,tapY-y);
    const correct = dist < radius*2;
    const timeMs = Date.now()-state.modifiedShownAt;
    if (!isWeb) {
      if(correct) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    dispatch({type:'TAP',correct,timeMs});
    clearTimer();
    timerRef.current=setTimeout(()=>dispatch({type:'NEXT_ROUND'}),1500);
  }, [state.phase, state.cardW, state.cardH, state.modifiedShownAt, round, clearTimer]);

  const correctCount = state.results.filter(r=>r.correct).length;
  const avgTime = state.results.length>0 ? (state.results.reduce((a,r)=>a+r.timeMs,0)/state.results.length/1000).toFixed(1) : '0.0';

  // Log to recent activity feed once per session when COMPLETE first fires
  const loggedRef = useRef(false);
  useEffect(() => {
    if (state.phase === 'COMPLETE' && !loggedRef.current) {
      loggedRef.current = true;
      logActivity('mode_complete', { mode: 'spot_the_change', modeName: 'Spot the Change', score: correctCount, scorePct: Math.round((correctCount / 5) * 100) });
    }
  }, [state.phase, correctCount]);

  if(state.phase==='READY') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: tc.bg }]} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={()=>router.back()}><Text style={s.closeBtn}>{String.fromCharCode(10005)}</Text></Pressable>
          <Badge label="SPOT THE CHANGE" />
          <View style={s.spacer}/>
        </View>
        <Animated.View entering={isWeb ? undefined : FadeIn} style={s.centered}>
          <Text style={s.modeIcon}>{mag}</Text>
          <Text style={s.title}>Spot The Change</Text>
          <Text style={s.sub}>5 rounds {String.fromCharCode(183)} find what changed</Text>
          <Button title="Start" onPress={()=>dispatch({type:'START'})} style={s.startBtn}/>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if(state.phase==='COMPLETE') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: tc.bg }]} edges={['top']}>
        <Animated.View entering={isWeb ? undefined : FadeIn} style={s.centered}>
          <Text style={s.modeIcon}>{mag}</Text>
          <Text style={s.title}>Challenge Complete!</Text>
          <Text style={s.scoreText}>{correctCount}/5</Text>
          <Text style={s.sub}>Average time: {avgTime}s</Text>
          <View style={s.resultsRow}>
            {state.results.map((r,i)=>(<View key={i} style={[s.resultDot, {backgroundColor:r.correct?colors.correct:colors.wrong}]}/>))}
          </View>
          <Button title="Done" onPress={()=>router.replace('/(tabs)')} style={s.startBtn}/>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={()=>{
          const activePhases: Phase[] = ['SHOW_ORIGINAL','BLANK','SHOW_MODIFIED','FEEDBACK'];
          if(activePhases.includes(state.phase)){setShowQuitConfirm(true);}
          else{clearTimer();router.back();}
        }}><Text style={s.closeBtn}>{String.fromCharCode(10005)}</Text></Pressable>
        <Text style={s.roundLabel}>Round {state.roundIndex+1} of 5</Text>
        <View style={s.spacer}/>
      </View>

      <View style={s.dotsRow}>
        {challenge.rounds.map((_,i)=>{
          let bg: string = 'rgba(0,0,0,0.06)';
          if(i<state.roundIndex) bg=state.results[i]?.correct?colors.correct:colors.wrong;
          else if(i===state.roundIndex) bg=colors.accent;
          return <View key={i} style={[s.dot,{backgroundColor:bg}]}/>;
        })}
      </View>

      {state.phase==='SHOW_ORIGINAL' && round && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={s.gameArea}>
          <CountdownTimer duration={round.viewTime} running={true} onComplete={handleOriginalComplete} style={s.timer}/>
          <Text style={s.phaseLabel}>Memorise this scene</Text>
          <SceneRenderer objects={round.originalScene.objects} visible={true}/>
        </Animated.View>
      )}

      {state.phase==='BLANK' && (
        <Animated.View entering={isWeb ? undefined : FadeIn} exiting={isWeb ? undefined : FadeOut} style={s.centered}>
          <Text style={s.blankText}>Look away...</Text>
        </Animated.View>
      )}

      {state.phase==='SHOW_MODIFIED' && round && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={s.gameArea}>
          <Text style={s.tapLabel}>TAP THE CHANGE</Text>
          <Pressable onPress={handleTap} onLayout={(e)=>{const{width,height}=e.nativeEvent.layout;dispatch({type:'LAYOUT',w:width,h:height});}}>
            <SceneRenderer objects={round.modifiedScene.objects} visible={true}/>
          </Pressable>
        </Animated.View>
      )}

      {state.phase==='FEEDBACK' && round && (
        <Animated.View entering={isWeb ? undefined : FadeIn} style={s.centered}>
          <Text style={[s.feedbackText,{color:state.tapCorrect?colors.correct:colors.wrong}]}>{state.tapCorrect?'Correct!':'Wrong!'}</Text>
          <Text style={s.feedbackDesc}>{round.change.description}</Text>
        </Animated.View>
      )}

      {showQuitConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowQuitConfirm(false)}>
          <View style={s.quitBackdrop}>
            <Pressable style={s.quitBackdropTouch} onPress={() => setShowQuitConfirm(false)} />
            <View style={[s.quitCard, { backgroundColor: colors.bg }]}>
              <Text style={[s.quitTitle, { color: colors.text }]}>Leave level?</Text>
              <Text style={[s.quitMessage, { color: colors.textMid }]}>You'll lose a life if you quit now.</Text>
              <Pressable style={[s.quitLeaveBtn, { backgroundColor: colors.wrong }]} onPress={() => { setShowQuitConfirm(false); clearTimer(); loseLife(); router.back(); }}>
                <Text style={s.quitBtnText}>Leave (-1 life)</Text>
              </Pressable>
              <Pressable style={[s.quitLeaveBtn, { backgroundColor: colors.accent }]} onPress={() => setShowQuitConfirm(false)}>
                <Text style={s.quitBtnText}>Keep playing</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

export default SpotGameScreen;

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg,paddingHorizontal:spacing.lg},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:spacing.md},
  closeBtn:{fontSize:typography.sizes.xl,color:colors.textMid,padding:spacing.sm},
  spacer:{width:36},
  roundLabel:{fontSize:typography.sizes.md,fontWeight:typography.weights.semibold,color:colors.textMid},
  centered:{flex:1,justifyContent:'center',alignItems:'center',gap:spacing.lg},
  gameArea:{flex:1,gap:spacing.lg,paddingTop:spacing.md},
  timer:{marginBottom:spacing.sm},
  modeIcon:{fontSize:48},
  title:{fontSize:typography.sizes.xxl,fontWeight:typography.weights.bold,color:colors.text},
  sub:{fontSize:typography.sizes.md,color:colors.textMid},
  startBtn:{minWidth:160,marginTop:spacing.lg},
  dotsRow:{flexDirection:'row',justifyContent:'center',gap:8,marginBottom:spacing.md},
  dot:{width:12,height:12,borderRadius:999},
  phaseLabel:{fontSize:typography.sizes.lg,fontWeight:typography.weights.medium,color:colors.textMid,textAlign:'center'},
  tapLabel:{fontSize:typography.sizes.lg,fontWeight:typography.weights.bold,color:colors.accent,textAlign:'center',letterSpacing:2},
  blankText:{fontSize:typography.sizes.display,fontWeight:typography.weights.black,color:colors.accent},
  feedbackText:{fontSize:28,fontWeight:typography.weights.bold},
  feedbackDesc:{fontSize:typography.sizes.md,color:colors.textMid,textAlign:'center'},
  scoreText:{fontSize:56,fontWeight:typography.weights.black,color:colors.text},
  resultsRow:{flexDirection:'row',gap:8},
  resultDot:{width:16,height:16,borderRadius:999},
  quitBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'center',alignItems:'center',padding:30},
  quitBackdropTouch:{...StyleSheet.absoluteFillObject},
  quitCard:{width:'100%',maxWidth:300,borderRadius:20,padding:24,alignItems:'center',gap:12},
  quitTitle:{fontSize:20,fontWeight:'700'},
  quitMessage:{fontSize:14,textAlign:'center',marginBottom:4},
  quitLeaveBtn:{paddingVertical:14,paddingHorizontal:32,borderRadius:14,alignItems:'center',width:'100%'},
  quitBtnText:{color:'#FFF',fontSize:16,fontWeight:'700'},
});
