/**
 * Journey Tab — Redesigned.
 * Horizontal pill selector, compact continue card, vertical worlds list with connectors.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated as RNAnimated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { CAMPAIGNS, CAMPAIGN_ORDER, TOTAL_MAX_STARS, type Campaign } from '@/src/data/campaigns';
import { spacing } from '@/src/theme/spacing';
import Svg, { Rect, Path, Polygon, Circle as SvgCircle } from 'react-native-svg';
import { supabase } from '@/src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

// ── Helpers ───────────────────────────────────────────────────────────
const GREEN = '#00B894';
const SIDE_PREFIX: Record<string, string> = { speed_recall: 'sr', snap_match: 'sm', sequence: 'seq', counting_blitz: 'cb', colour_chain: 'cc' };

function StarSvg({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
}

function LockSvg({ size = 14, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={11} rx={2} fill={color} /><Path d="M8,11 V8 A4,4 0 0,1 16,8 V11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

function CheckSvg({ size = 14, color = '#FFF' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
}

function ChevronSvg({ size = 16, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
}

// ── Progress Ring ─────────────────────────────────────────────────────
function ProgressRing({ percentage, color, size = 26 }: { percentage: number; color: string; size?: number }) {
  const r = (size - 3) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percentage, 100) / 100);
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECEAE8" strokeWidth={2.5} />
      {percentage > 0 && (
        <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={`${circumference}`} strokeDashoffset={offset} strokeLinecap="round" />
      )}
    </Svg>
  );
}

// ── World data computation ────────────────────────────────────────────
interface WorldData {
  name: string;
  worldNum: number;
  totalLevels: number;
  completed: number;
  unlocked: boolean;
  isComplete: boolean;
  isCurrent: boolean;
  stars: number;
  maxStars: number;
}

// ── Scroll Hint Arrow — flashes once then disappears ──────────────────
function ScrollHintArrow() {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    // Fade in + pulse right, then fade out after 2s
    const anim = RNAnimated.sequence([
      RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(translateX, { toValue: 4, duration: 400, useNativeDriver: true }),
          RNAnimated.timing(translateX, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ),
      RNAnimated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);
    anim.start();
  }, []);

  return (
    <RNAnimated.View style={[st.scrollHint, { opacity, transform: [{ translateX }] }]}>
      <Ionicons name="chevron-forward" size={16} color="#6C5CE7" />
    </RNAnimated.View>
  );
}

function JourneyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { totalStars, levelProgress } = useGameStore();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sideCampaignProgress, setSideCampaignProgress] = useState<Record<string, { stars: number; best_score: number }>>({});

  // Load side campaign progress
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) return;
          const { data } = await supabase.from('side_campaign_progress').select('level_id, stars, best_score').eq('user_id', session.user.id);
          if (data) {
            const p: Record<string, { stars: number; best_score: number }> = {};
            data.forEach(r => { p[r.level_id] = { stars: r.stars, best_score: r.best_score }; });
            setSideCampaignProgress(p);
          }
        } catch {}
      })();
    }, [])
  );

  // Classic world completion check
  function getClassicWorldsCompleted(): number {
    const wl = [20, 30, 35, 35, 40, 40];
    let done = 0;
    for (let w = 0; w < 6; w++) {
      let allDone = true;
      for (let l = 1; l <= wl[w]; l++) { if (!levelProgress[`w${w + 1}-l${l}`]) { allDone = false; break; } }
      if (allDone) done = w + 1; else break;
    }
    return done;
  }
  const classicWorldsDone = getClassicWorldsCompleted();

  // Build modes array with computed data
  const modes = CAMPAIGN_ORDER.map(id => {
    const c = CAMPAIGNS[id];
    const locked = classicWorldsDone < c.unlockAfterWorld;
    let completedLevels = 0;
    let totalCompletedStars = 0;

    if (id === 'classic') {
      c.levelsPerWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) {
          const p = levelProgress[`w${i + 1}-l${l}`];
          if (p) { completedLevels++; totalCompletedStars += p.stars; }
        }
      });
    } else {
      const prefix = SIDE_PREFIX[id] ?? id;
      c.levelsPerWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) {
          const p = sideCampaignProgress[`${prefix}_w${i + 1}_l${l}`];
          if (p) { completedLevels++; totalCompletedStars += p.stars; }
        }
      });
    }

    return { id, campaign: c, locked, completedLevels, totalCompletedStars };
  });

  const selected = modes[selectedIdx];
  const campaign = selected.campaign;
  const modeColor = campaign.color;
  const hasStarted = selected.completedLevels > 0;
  const overallPct = Math.round((selected.completedLevels / campaign.totalLevels) * 100);

  // Build world data for selected mode
  function buildWorlds(): WorldData[] {
    return campaign.worldNames.map((name, i) => {
      const worldNum = i + 1;
      const totalLevels = campaign.levelsPerWorld[i];
      let completed = 0;
      let stars = 0;

      if (selected.id === 'classic') {
        for (let l = 1; l <= totalLevels; l++) {
          const p = levelProgress[`w${worldNum}-l${l}`];
          if (p) { completed++; stars += p.stars; }
        }
      } else {
        const prefix = SIDE_PREFIX[selected.id] ?? selected.id;
        for (let l = 1; l <= totalLevels; l++) {
          const p = sideCampaignProgress[`${prefix}_w${worldNum}_l${l}`];
          if (p) { completed++; stars += p.stars; }
        }
      }

      // Unlock logic
      let unlocked = false;
      if (selected.locked) {
        unlocked = false;
      } else if (worldNum === 1) {
        unlocked = true;
      } else {
        const prevTotal = campaign.levelsPerWorld[i - 1];
        let prevDone = 0;
        if (selected.id === 'classic') {
          for (let l = 1; l <= prevTotal; l++) { if (levelProgress[`w${worldNum - 1}-l${l}`]) prevDone++; }
        } else {
          const prefix = SIDE_PREFIX[selected.id] ?? selected.id;
          for (let l = 1; l <= prevTotal; l++) { if (sideCampaignProgress[`${prefix}_w${worldNum - 1}_l${l}`]) prevDone++; }
        }
        unlocked = prevDone >= prevTotal;
      }

      const isComplete = completed >= totalLevels;
      return { name, worldNum, totalLevels, completed, unlocked, isComplete, isCurrent: false, stars, maxStars: totalLevels * 3 };
    });
  }

  const worlds = buildWorlds();
  // Mark the first incomplete unlocked world as current
  const currentIdx = worlds.findIndex(w => w.unlocked && !w.isComplete);
  if (currentIdx >= 0) worlds[currentIdx].isCurrent = true;
  const continueWorld = worlds[currentIdx >= 0 ? currentIdx : 0];

  function navigateToWorld(w: WorldData) {
    if (!w.unlocked) return;
    if (selected.id === 'classic') {
      router.push(`/world/${w.worldNum}`);
    } else {
      router.push({ pathname: '/world/side-world', params: { mode: selected.id, worldNumber: String(w.worldNum), worldName: w.name } });
    }
  }

  return (
    <TabTransition>
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <Text style={[st.title, { color: colors.text }]}>Journey</Text>
        <View style={[st.starPill, { backgroundColor: colors.goldSoft }]}>
          <StarSvg size={13} color={totalStars > 0 ? '#D4A012' : '#B2BEC3'} />
          <Text style={[st.starCount, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/{TOTAL_MAX_STARS}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Mode Selector Pills ── */}
        <View style={st.pillContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            style={st.pillScroll}
            contentContainerStyle={st.pillRow}
          >
          {modes.map((m, i) => {
            const isActive = i === selectedIdx;
            const c = m.campaign;
            const pct = m.locked ? 0 : Math.round((m.completedLevels / c.totalLevels) * 100);
            return (
              <Pressable
                key={m.id}
                style={[st.pill, {
                  backgroundColor: isActive ? c.color + '08' : '#FFF',
                  borderColor: isActive ? c.color + '22' : '#E8E6E3',
                  opacity: m.locked ? 0.45 : 1,
                }]}
                onPress={() => !m.locked && setSelectedIdx(i)}
                disabled={m.locked}
              >
                <View style={st.pillRingWrap}>
                  <ProgressRing percentage={pct} color={m.locked ? '#B2BEC3' : c.color} size={26} />
                  <Text style={[st.pillLetter, { color: m.locked ? '#B2BEC3' : isActive ? c.color : '#636E72' }]}>{c.name[0]}</Text>
                </View>
                <Text style={[st.pillName, { color: m.locked ? '#B2BEC3' : isActive ? c.color : '#636E72' }]} numberOfLines={1}>{c.name}</Text>
                {m.locked && <LockSvg size={10} color="#B2BEC3" />}
              </Pressable>
            );
          })}
          </ScrollView>
          <ScrollHintArrow />
        </View>

        {/* ── Continue / Start Hero Card ── */}
        {!selected.locked && (
          hasStarted ? (
            // Continue state
            <Pressable onPress={() => navigateToWorld(continueWorld)} style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={[modeColor, modeColor + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.heroCard}>
                <View style={st.heroContent}>
                  <Text style={st.heroLabel}>{`CONTINUE \u00B7 WORLD ${continueWorld.worldNum}`}</Text>
                  <Text style={st.heroWorldName}>{continueWorld.name}</Text>
                  <View style={st.heroProgressRow}>
                    <View style={st.heroTrack}>
                      <View style={[st.heroFill, { width: `${Math.round((continueWorld.completed / continueWorld.totalLevels) * 100)}%` }]} />
                    </View>
                    <Text style={st.heroCount}>{continueWorld.completed}/{continueWorld.totalLevels}</Text>
                  </View>
                </View>
                <View style={st.heroPlayBtn}>
                  <Text style={st.heroPlayText}>Play</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            // Start state (new campaign)
            <Pressable onPress={() => navigateToWorld(worlds[0])} style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={[modeColor + '20', modeColor + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.heroCard, st.heroCardNew, { borderColor: modeColor + '18' }]}>
                <View style={st.heroContent}>
                  <Text style={[st.heroLabel, { color: modeColor, opacity: 0.6 }]}>NEW CAMPAIGN</Text>
                  <Text style={[st.heroWorldName, { color: modeColor }]}>{campaign.name}</Text>
                  <Text style={[st.heroNewMeta, { color: colors.textMid }]}>{campaign.worldCount} world{campaign.worldCount !== 1 ? 's' : ''} {'\u00B7'} {campaign.totalLevels} levels</Text>
                </View>
                <View style={[st.heroPlayBtn, { backgroundColor: modeColor }]}>
                  <Text style={st.heroPlayText}>Start</Text>
                </View>
              </LinearGradient>
            </Pressable>
          )
        )}

        {/* ── Worlds List ── */}
        {!selected.locked && (
          <>
            <Text style={[st.sectionLabel, { color: colors.textLight }]}>{campaign.name.toUpperCase()} WORLDS</Text>
            {worlds.map((w, i) => {
              const prevWorld = i > 0 ? worlds[i - 1] : null;
              const almostDone = w.unlocked && !w.isComplete && w.completed / w.totalLevels >= 0.8;

              // Connector line colour
              let connectorColor = '#E8E6E1';
              if (prevWorld?.isComplete && w.isComplete) connectorColor = GREEN;
              else if (prevWorld?.isComplete && w.isCurrent) connectorColor = modeColor + '40';

              // Left border colour
              let leftBorder = 'transparent';
              if (w.isComplete) leftBorder = GREEN;
              else if (w.isCurrent) leftBorder = modeColor;

              return (
                <React.Fragment key={w.worldNum}>
                  {/* Connector line */}
                  {i > 0 && <View style={[st.connector, { backgroundColor: connectorColor }]} />}

                  <Pressable
                    style={[st.worldRow, {
                      backgroundColor: w.isCurrent ? colors.card : w.isComplete ? GREEN + '04' : 'transparent',
                      borderLeftColor: leftBorder,
                      borderLeftWidth: leftBorder !== 'transparent' ? 3 : 0,
                      opacity: !w.unlocked ? 0.4 : 1,
                      ...(w.isCurrent ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 } : {}),
                    }]}
                    onPress={() => navigateToWorld(w)}
                    disabled={!w.unlocked}
                  >
                    {/* Circle indicator */}
                    {w.isComplete ? (
                      <View style={[st.worldCircle, { backgroundColor: GREEN }]}>
                        <CheckSvg size={16} color="#FFF" />
                      </View>
                    ) : w.isCurrent ? (
                      <View style={[st.worldCircle, { backgroundColor: modeColor + '15', borderWidth: 2, borderColor: modeColor }]}>
                        <Text style={[st.worldCircleNum, { color: modeColor }]}>{w.worldNum}</Text>
                      </View>
                    ) : w.unlocked ? (
                      <View style={[st.worldCircle, { backgroundColor: '#F0EFEC' }]}>
                        <Text style={[st.worldCircleNum, { color: '#636E72' }]}>{w.worldNum}</Text>
                      </View>
                    ) : (
                      <View style={[st.worldCircle, { backgroundColor: '#F0EFEC' }]}>
                        <LockSvg size={14} color="#B2BEC3" />
                      </View>
                    )}

                    {/* Info */}
                    <View style={st.worldInfo}>
                      <View style={st.worldNameRow}>
                        <Text style={[st.worldName, { color: w.unlocked ? colors.text : colors.textLight }]}>{w.name}</Text>
                        {almostDone && (
                          <View style={[st.almostBadge, { backgroundColor: GREEN + '15' }]}>
                            <Text style={[st.almostText, { color: GREEN }]}>ALMOST!</Text>
                          </View>
                        )}
                        {w.isComplete && (
                          <View style={st.miniStars}>
                            {[1, 2, 3].map(s => (
                              <StarSvg key={s} size={10} color={w.stars >= w.maxStars * (s / 3) ? '#D4A012' : '#E8E6E3'} />
                            ))}
                          </View>
                        )}
                      </View>
                      {w.unlocked ? (
                        <View style={st.worldProgressRow}>
                          <View style={[st.worldTrack, { maxWidth: 100 }]}>
                            <View style={[st.worldFill, { width: `${Math.round((w.completed / w.totalLevels) * 100)}%`, backgroundColor: w.isComplete ? GREEN : modeColor }]} />
                          </View>
                          <Text style={[st.worldCount, { color: w.isComplete ? GREEN : colors.textLight }]}>
                            {w.isComplete ? 'Complete' : `${w.completed}/${w.totalLevels}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[st.worldLocked, { color: colors.textLight }]}>Complete World {w.worldNum - 1} to unlock</Text>
                      )}
                    </View>

                    {/* Chevron */}
                    {w.unlocked && (
                      <ChevronSvg size={16} color={w.isCurrent ? modeColor + '80' : '#D0CEC8'} />
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Locked campaign message */}
        {selected.locked && (
          <View style={st.lockedMsg}>
            <LockSvg size={24} color={colors.textLight} />
            <Text style={[st.lockedTitle, { color: colors.text }]}>{campaign.name} is locked</Text>
            <Text style={[st.lockedSub, { color: colors.textMid }]}>Complete Classic World {campaign.unlockAfterWorld} to unlock</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

export default JourneyTab;

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  starPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  starCount: { fontSize: 14, fontWeight: '700' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

  // Pills
  pillContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pillScroll: { flex: 1, marginHorizontal: -spacing.lg },
  pillRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 4 },
  scrollHint: { marginRight: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5,
  },
  pillRingWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  pillLetter: { position: 'absolute', fontSize: 9, fontWeight: '800' },
  pillName: { fontSize: 11, fontWeight: '600' },

  // Hero card
  heroCard: {
    borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center',
    marginBottom: 4,
  },
  heroCardNew: { borderWidth: 1 },
  heroContent: { flex: 1 },
  heroLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 3, textTransform: 'uppercase' },
  heroWorldName: { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 2, backgroundColor: '#FFF' },
  heroCount: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  heroNewMeta: { fontSize: 11 },
  heroPlayBtn: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginLeft: 14 },
  heroPlayText: { fontSize: 13, fontWeight: '800', color: '#1A1A18' },

  // World rows
  connector: { width: 2, height: 8, alignSelf: 'center', marginLeft: 35, borderRadius: 1 },
  worldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14,
  },
  worldCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  worldCircleNum: { fontSize: 14, fontWeight: '800' },
  worldInfo: { flex: 1 },
  worldNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  worldName: { fontSize: 14, fontWeight: '700' },
  almostBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  almostText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  miniStars: { flexDirection: 'row', gap: 2 },
  worldProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  worldTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#ECEAE8', overflow: 'hidden' },
  worldFill: { height: '100%', borderRadius: 2 },
  worldCount: { fontSize: 11, fontWeight: '600' },
  worldLocked: { fontSize: 11 },

  // Locked campaign
  lockedMsg: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  lockedTitle: { fontSize: 16, fontWeight: '700' },
  lockedSub: { fontSize: 13 },
});
