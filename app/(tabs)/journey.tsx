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
import { InfoCard } from '@/src/components/InfoCard';
import { t } from '@/src/i18n';

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

/** Brain benefit pills — shows what cognitive skills each mode trains.
 *  Keyed by campaign id so it updates when the player switches modes. */
// Mode benefits — resolve via t() at render time so switching
// language re-reads without remounting the pills.
const MODE_BENEFIT_KEYS: Record<string, string[]> = {
  classic:       ['journey.benefits.classic_1', 'journey.benefits.classic_2', 'journey.benefits.classic_3'],
  speed_recall:  ['journey.benefits.speed_recall_1', 'journey.benefits.speed_recall_2', 'journey.benefits.speed_recall_3'],
  snap_match:    ['journey.benefits.snap_match_1', 'journey.benefits.snap_match_2', 'journey.benefits.snap_match_3'],
  sequence:      ['journey.benefits.sequence_1', 'journey.benefits.sequence_2', 'journey.benefits.sequence_3'],
  counting_blitz: ['journey.benefits.counting_blitz_1', 'journey.benefits.counting_blitz_2', 'journey.benefits.counting_blitz_3'],
  colour_chain:  ['journey.benefits.colour_chain_1', 'journey.benefits.colour_chain_2', 'journey.benefits.colour_chain_3'],
};

function ProgressRing({ percentage, color, trackColor = '#ECEAE8', size = 26 }: { percentage: number; color: string; trackColor?: string; size?: number }) {
  const r = (size - 3) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percentage, 100) / 100);
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <SvgCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={2.5} />
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
  const scrollRef = useRef<ScrollView>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [infoCard, setInfoCard] = useState<string | null>(null);
  const [infoCardData, setInfoCardData] = useState<{ title: string; desc: string } | null>(null);
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
          if (p && p.stars > 0) { completedLevels++; totalCompletedStars += p.stars; }
        }
      });
    } else {
      const prefix = SIDE_PREFIX[id] ?? id;
      c.levelsPerWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) {
          const p = sideCampaignProgress[`${prefix}_w${i + 1}_l${l}`];
          if (p && p.stars > 0) { completedLevels++; totalCompletedStars += p.stars; }
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
          if (p && p.stars > 0) { completed++; stars += p.stars; }
        }
      } else {
        const prefix = SIDE_PREFIX[selected.id] ?? selected.id;
        for (let l = 1; l <= totalLevels; l++) {
          const p = sideCampaignProgress[`${prefix}_w${worldNum}_l${l}`];
          if (p && p.stars > 0) { completed++; stars += p.stars; }
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
        <Text style={[st.title, { color: colors.text }]}>{t('journey.title')}</Text>
        <Pressable
          onPress={() => setInfoCard(infoCard === 'stars' ? null : 'stars')}
          style={[st.starPill, { backgroundColor: colors.goldSoft }]}
          accessibilityRole="button"
          accessibilityLabel={t('journey.stars_aria', { count: totalStars, total: TOTAL_MAX_STARS })}
          accessibilityHint={t('journey.stars_hint')}
        >
          <StarSvg size={13} color={totalStars > 0 ? '#D4A012' : '#B2BEC3'} />
          <Text style={[st.starCount, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/{TOTAL_MAX_STARS}</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} onLayout={() => {
        // Auto-scroll to current world after layout
        const currentWorldIdx = worlds.findIndex(w => w.isCurrent);
        if (currentWorldIdx > 1) {
          setTimeout(() => scrollRef.current?.scrollTo({ y: currentWorldIdx * 80, animated: true }), 300);
        }
      }}>
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
                  backgroundColor: isActive ? c.color + '08' : colors.card,
                  borderColor: isActive ? c.color + '22' : colors.border,
                  opacity: m.locked ? 0.45 : 1,
                }]}
                onPress={() => !m.locked && setSelectedIdx(i)}
                disabled={m.locked}
                accessibilityRole="button"
                accessibilityLabel={m.locked
                  ? t('journey.pill_aria_locked', { name: c.name, pct })
                  : t('journey.pill_aria', { name: c.name, pct })}
                accessibilityState={{ selected: isActive, disabled: m.locked }}
              >
                <View style={st.pillRingWrap}>
                  <ProgressRing percentage={pct} color={m.locked ? '#B2BEC3' : c.color} trackColor={colors.surface} size={26} />
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
            <Pressable
              onPress={() => navigateToWorld(continueWorld)}
              style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              accessibilityRole="button"
              accessibilityLabel={t('journey.continue_aria', { name: continueWorld.name, world: continueWorld.worldNum })}
            >
              <LinearGradient colors={[modeColor, modeColor + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.heroCard}>
                <View style={st.heroContent}>
                  <Text style={st.heroLabel}>{t('journey.continue_label', { world: continueWorld.worldNum })}</Text>
                  <Text style={st.heroWorldName}>{continueWorld.name}</Text>
                  <View style={st.heroProgressRow}>
                    <View style={st.heroTrack}>
                      <View style={[st.heroFill, { width: `${Math.round((continueWorld.completed / continueWorld.totalLevels) * 100)}%` }]} />
                    </View>
                    <Text style={st.heroCount}>{continueWorld.completed}/{continueWorld.totalLevels}</Text>
                  </View>
                </View>
                <View style={st.heroPlayBtn}>
                  <Text style={st.heroPlayText}>{t('journey.play')}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            // Start state (new campaign)
            <Pressable
              onPress={() => navigateToWorld(worlds[0])}
              style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              accessibilityRole="button"
              accessibilityLabel={t('journey.start_aria', { campaign: campaign.name })}
            >
              <LinearGradient colors={[modeColor + '20', modeColor + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.heroCard, st.heroCardNew, { borderColor: modeColor + '18' }]}>
                <View style={st.heroContent}>
                  <Text style={[st.heroLabel, { color: modeColor, opacity: 0.6 }]}>{t('journey.new_campaign')}</Text>
                  <Text style={[st.heroWorldName, { color: modeColor }]}>{campaign.name}</Text>
                  <Text style={[st.heroNewMeta, { color: colors.textMid }]}>{campaign.worldCount === 1 ? t('journey.campaign_meta_one', { levels: campaign.totalLevels }) : t('journey.campaign_meta_many', { worlds: campaign.worldCount, levels: campaign.totalLevels })}</Text>
                </View>
                <View style={[st.heroPlayBtn, { backgroundColor: modeColor }]}>
                  <Text style={st.heroPlayText}>{t('journey.start')}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          )
        )}

        {/* ── Brain benefit pills ── */}
        {!selected.locked && (
          <View style={st.benefitsRow}>
            <Text style={st.benefitsEmoji}>{'\uD83E\uDDE0'}</Text>
            {(MODE_BENEFIT_KEYS[selected.id] ?? MODE_BENEFIT_KEYS.classic).map((key) => { const label = t(key); return (
              <View key={key} style={[st.benefitPill, { backgroundColor: modeColor + '08' }]}>
                <Text style={[st.benefitText, { color: modeColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</Text>
              </View>
            ); })}
          </View>
        )}

        {/* ── Worlds List ── */}
        {!selected.locked && (
          <>
            <Text style={[st.sectionLabel, { color: colors.textLight }]}>{t('journey.worlds_section', { campaign: campaign.name.toUpperCase() })}</Text>
            {worlds.map((w, i) => {
              const prevWorld = i > 0 ? worlds[i - 1] : null;
              const almostDone = w.unlocked && !w.isComplete && w.completed / w.totalLevels >= 0.8;

              // Connector line colour
              let connectorColor = colors.surface;
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
                    accessibilityRole="button"
                    accessibilityLabel={!w.unlocked ? t('journey.world_aria_locked', { world: w.worldNum, name: w.name }) : w.isComplete ? t('journey.world_aria_complete', { world: w.worldNum, name: w.name }) : t('journey.world_aria', { world: w.worldNum, name: w.name })}
                    accessibilityState={{ disabled: !w.unlocked }}
                    onPress={() => {
                      if (w.unlocked) { navigateToWorld(w); }
                      else {
                        const prev = i > 0 ? worlds[i - 1] : null;
                        const remaining = prev ? prev.totalLevels - prev.completed : 0;
                        setInfoCardData({
                          title: t('journey.locked_title'),
                          desc: prev
                            ? (remaining === 1
                                ? t('journey.locked_body_one_left', { total: prev.totalLevels, prev: prev.worldNum, prevName: prev.name, next: w.name })
                                : t('journey.locked_body_many_left', { total: prev.totalLevels, prev: prev.worldNum, prevName: prev.name, next: w.name, remaining }))
                            : t('journey.locked_body_no_prev', { name: w.name }),
                        });
                        setInfoCard('locked');
                      }
                    }}
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
                      <View style={[st.worldCircle, { backgroundColor: colors.surface }]}>
                        <Text style={[st.worldCircleNum, { color: '#636E72' }]}>{w.worldNum}</Text>
                      </View>
                    ) : (
                      <View style={[st.worldCircle, { backgroundColor: colors.surface }]}>
                        <LockSvg size={14} color="#B2BEC3" />
                      </View>
                    )}

                    {/* Info */}
                    <View style={st.worldInfo}>
                      <View style={st.worldNameRow}>
                        <Text style={[st.worldName, { color: w.unlocked ? colors.text : colors.textLight }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{w.name}</Text>
                        {almostDone && (
                          <View style={[st.almostBadge, { backgroundColor: GREEN + '15' }]}>
                            <Text style={[st.almostText, { color: GREEN }]} numberOfLines={1}>{t('journey.almost')}</Text>
                          </View>
                        )}
                        {w.isComplete && (
                          <View style={st.miniStars}>
                            {[1, 2, 3].map(s => (
                              <StarSvg key={s} size={10} color={w.stars >= w.maxStars * (s / 3) ? '#D4A012' : colors.border} />
                            ))}
                          </View>
                        )}
                      </View>
                      {w.unlocked ? (
                        <View style={st.worldProgressRow}>
                          <View style={[st.worldTrack, { maxWidth: 100, backgroundColor: colors.surface }]}>
                            <View style={[st.worldFill, { width: `${Math.round((w.completed / w.totalLevels) * 100)}%`, backgroundColor: w.isComplete ? GREEN : modeColor }]} />
                          </View>
                          <Text style={[st.worldCount, { color: w.isComplete ? GREEN : colors.textLight }]}>
                            {w.isComplete ? t('journey.world_complete') : `${w.completed}/${w.totalLevels}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[st.worldLocked, { color: colors.textLight }]}>{t('journey.world_locked_hint', { prev: w.worldNum - 1 })}</Text>
                      )}
                    </View>

                    {/* Chevron */}
                    {w.unlocked && (
                      <ChevronSvg size={16} color={w.isCurrent ? modeColor + '80' : colors.textLight} />
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
            <Text style={[st.lockedTitle, { color: colors.text }]}>{t('journey.campaign_locked_title', { name: campaign.name })}</Text>
            <Text style={[st.lockedSub, { color: colors.textMid }]}>{t('journey.campaign_locked_sub', { world: campaign.unlockAfterWorld })}</Text>
          </View>
        )}
      </ScrollView>
      {/* Info Cards */}
      <InfoCard
        visible={infoCard === 'stars'}
        icon={<StarSvg size={20} color="#D4A012" />}
        title={t('journey.stars_info_title')}
        description={t('journey.stars_info_desc', { earned: totalStars, total: TOTAL_MAX_STARS, pct: TOTAL_MAX_STARS > 0 ? Math.round((totalStars / TOTAL_MAX_STARS) * 100) : 0 })}
        tip={totalStars < TOTAL_MAX_STARS / 2 ? t('journey.stars_info_tip_low') : totalStars < TOTAL_MAX_STARS * 0.8 ? t('journey.stars_info_tip_mid') : t('journey.stars_info_tip_high')}
        accentColor="#D4A012"
        onClose={() => setInfoCard(null)}
      />
      <InfoCard
        visible={infoCard === 'locked'}
        icon={<LockSvg size={20} color="#636E72" />}
        title={infoCardData?.title ?? t('journey.locked_title')}
        description={infoCardData?.desc ?? t('journey.locked_body_no_prev', { name: '' })}
        accentColor="#636E72"
        onClose={() => setInfoCard(null)}
      />
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
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 12 },
  benefitsEmoji: { fontSize: 12, marginRight: 2 },
  benefitPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  benefitText: { fontSize: 9, fontWeight: '600' },

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
  worldTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  worldFill: { height: '100%', borderRadius: 2 },
  worldCount: { fontSize: 11, fontWeight: '600' },
  worldLocked: { fontSize: 11 },

  // Locked campaign
  lockedMsg: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  lockedTitle: { fontSize: 16, fontWeight: '700' },
  lockedSub: { fontSize: 13 },
});
