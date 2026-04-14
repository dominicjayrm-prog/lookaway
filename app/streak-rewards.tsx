/**
 * Streak Rewards screen — full progression view linked from the home
 * screen's streak card. Shows:
 *   • Hero: Blink (streak expression) + count + "next reward" pill
 *   • This-week calendar with played/today/future states
 *   • Streak Shields card with current count
 *   • Vertical milestone timeline. Four states per node:
 *       - claimed (green check)
 *       - reachable + unclaimed (gold gift, "TAP TO CLAIM" badge, pulsing)
 *       - next unreached (coral with progress bar)
 *       - future (dimmed 45%)
 *
 * Tap a reachable node → claim animation: scale bounce + gold flash on
 * the card, gem/shield icons fly up + fade out, then the global toast
 * (mounted in _layout.tsx) plays the standard reward celebration.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { useAuth } from '@/src/providers/AuthProvider';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { STREAK_MILESTONES, type StreakMilestone } from '@/src/data/streakMilestones';
import { getStreakRewards, claimSingleMilestone, type StreakRewardRow } from '@/src/utils/streakRewards';

const FIRE = '\uD83D\uDD25';
const SHIELD = '\uD83D\uDEE1\uFE0F';
const GIFT = '\uD83C\uDF81';
const TROPHY = '\uD83C\uDFC6';
const isWeb = Platform.OS === 'web';

export default function StreakRewardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const streakCount = useGameStore((s) => s.streakCount);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const streakShields = useGameStore((s) => s.streakShields);
  const lastPlayDate = useGameStore((s) => s.lastPlayDate);

  const [rows, setRows] = useState<StreakRewardRow[]>([]);
  // Re-fetch trigger — bumped after a successful claim so the row state
  // re-loads from Supabase and the timeline reflects the new claimed flag.
  const [reloadTick, setReloadTick] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getStreakRewards(user.id).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [user?.id, reloadTick]);

  // Build a `claimed` lookup the milestone nodes use to decide their state
  const claimedByDay = new Map<number, boolean>();
  for (const r of rows) claimedByDay.set(r.milestone_day, r.claimed);

  // Reachable but unclaimed = streak qualifies AND row hasn't been flipped
  const reachableUnclaimed = STREAK_MILESTONES.filter(
    (m) => streakCount >= m.day && claimedByDay.get(m.day) !== true,
  );
  // "Next" milestone is the first one the player HASN'T REACHED yet (the
  // future goal) — distinct from "reachable + unclaimed" which is a
  // claimable reward sitting there waiting.
  const nextMilestone: StreakMilestone | null =
    STREAK_MILESTONES.find((m) => streakCount < m.day) ?? null;
  const daysToNext = nextMilestone ? Math.max(0, nextMilestone.day - streakCount) : 0;

  // Push a claimed milestone to the global toast queue + bump reload so the
  // local row mirror refreshes from Supabase. Also mirrors the local
  // streakShields counter immediately for instant feedback in the shield
  // status card on this screen.
  const pushStreakRewards = useGameStore((s) => s.pushStreakRewards);
  const handleClaimComplete = (m: StreakMilestone, claimedAt: string) => {
    pushStreakRewards([{ ...m, claimedAt }]);
    if (m.shields > 0) {
      useGameStore.setState((s) => ({ streakShields: s.streakShields + m.shields }));
    }
    if (m.gems > 0) {
      // Mirror gems locally so the AnimatedGemCount on home/shop animates
      // when the player navigates back. Cloud already has the new value.
      useGameStore.setState((s) => ({ gems: s.gems + m.gems }));
    }
    useGameStore.setState((s) => ({
      streakMilestonesClaimed: Array.from(new Set([...s.streakMilestonesClaimed, m.day])),
    }));
    setReloadTick((n) => n + 1);
  };

  // Claim all reachable in sequence with a small stagger so each one
  // gets its own toast appearance. Claimed serially to avoid race.
  const [claimingAll, setClaimingAll] = useState(false);
  const claimAll = async () => {
    if (!user?.id || claimingAll) return;
    setClaimingAll(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    for (const m of reachableUnclaimed) {
      const result = await claimSingleMilestone(user.id, m.day, streakCount);
      if (result) handleClaimComplete(m, result.claimedAt);
    }
    setClaimingAll(false);
  };

  const playedToday = lastPlayDate === new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <Pressable
          onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}
          hitSlop={12}
          style={[st.backBtn, { backgroundColor: colors.surface }]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMid} />
        </Pressable>
        <Text style={[st.title, { color: colors.text }]}>Your Streak</Text>
        <View style={[st.bestPill, { backgroundColor: colors.goldSoft }]}>
          <Text style={[st.bestPillText, { color: colors.gold }]}>{TROPHY} Best: {bestStreak}d</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — Blink + count + next reward pill */}
        <FloatingBlink />
        <CountUp value={streakCount} style={[st.streakNum, { color: colors.wrong }]} />
        <Text style={[st.streakLabel, { color: colors.textMid }]}>day streak</Text>

        {nextMilestone && (
          <View style={[st.nextPill, { backgroundColor: colors.wrongSoft }]}>
            <Text style={st.nextPillEmoji}>{GIFT}</Text>
            <Text style={[st.nextPillText, { color: colors.wrong }]}>
              Day {nextMilestone.day}: {nextMilestone.gems} gems
              {nextMilestone.shields > 0 ? ` + ${nextMilestone.shields} shield${nextMilestone.shields > 1 ? 's' : ''}` : ''}
              {' — '}{daysToNext} day{daysToNext !== 1 ? 's' : ''} away
            </Text>
          </View>
        )}
        {!nextMilestone && (
          <View style={[st.nextPill, { backgroundColor: colors.goldSoft }]}>
            <Text style={[st.nextPillText, { color: colors.gold }]}>{TROPHY} All rewards claimed!</Text>
          </View>
        )}

        {/* This week calendar */}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[st.cardLabel, { color: colors.textLight }]}>THIS WEEK</Text>
          <WeekRow playedToday={playedToday} colors={colors} />
        </View>

        {/* Streak shields */}
        <View style={[st.card, st.shieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.shieldRow}>
            <Text style={st.shieldEmoji}>{SHIELD}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.shieldTitle, { color: colors.text }]}>Streak Shields</Text>
              <Text style={[st.shieldDesc, { color: colors.textMid }]}>Protects your streak if you miss a day</Text>
            </View>
            <View style={[st.shieldCountPill, { backgroundColor: streakShields > 0 ? colors.correctSoft : colors.wrongSoft }]}>
              <Text style={[st.shieldCount, { color: streakShields > 0 ? colors.correct : colors.wrong }]}>{streakShields}</Text>
            </View>
          </View>
        </View>

        {/* Rewards timeline */}
        <View style={st.sectionHeader}>
          <Text style={[st.sectionLabel, { color: colors.textLight }]}>STREAK REWARDS</Text>
          {reachableUnclaimed.length > 1 && (
            <Pressable
              onPress={claimAll}
              disabled={claimingAll}
              style={({ pressed }) => [
                st.claimAllBtn,
                { backgroundColor: colors.gold, opacity: claimingAll ? 0.55 : pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Claim all ${reachableUnclaimed.length} pending rewards`}
            >
              <Text style={st.claimAllText}>
                {GIFT} Claim all {reachableUnclaimed.length}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={st.timeline}>
          {STREAK_MILESTONES.map((m) => {
            const claimed = claimedByDay.get(m.day) === true;
            const reached = streakCount >= m.day;
            const reachableUnclaim = reached && !claimed;
            const isNext = !reached && nextMilestone?.day === m.day;
            return (
              <MilestoneNode
                key={m.day}
                milestone={m}
                claimed={claimed}
                reachableUnclaim={reachableUnclaim}
                isNext={isNext}
                currentStreak={streakCount}
                colors={colors}
                userId={user?.id ?? null}
                onClaimed={(claimedAt) => handleClaimComplete(m, claimedAt)}
              />
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Floating Blink hero ───────────────────────────────────────────
function FloatingBlink() {
  const float = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (isWeb) return;
    const loop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(float, { toValue: -5, duration: 1500, useNativeDriver: true }),
        RNAnimated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [float]);
  return (
    <RNAnimated.View style={{ transform: [{ translateY: float }], marginTop: 4 }}>
      <AnimatedBlink expression="streak" size={70} />
    </RNAnimated.View>
  );
}

// ─── Count-up text ──────────────────────────────────────────────────
function CountUp({ value, style }: { value: number; style: any }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1100;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{n}</Text>;
}

// ─── This week row (Mon–Sun) ────────────────────────────────────────
function WeekRow({ playedToday, colors }: { playedToday: boolean; colors: any }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Today index 0=Mon … 6=Sun
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  return (
    <View style={st.weekRow}>
      {labels.map((d, i) => {
        const isPast = i < todayIdx;
        const isToday = i === todayIdx;
        const completed = isPast || (isToday && playedToday);
        const backgroundColor = completed ? colors.wrongSoft : isToday ? colors.goldSoft : colors.surface;
        const borderColor = isToday
          ? (playedToday ? colors.wrong : colors.gold)
          : completed
          ? colors.wrong + '30'
          : 'transparent';
        return (
          <View key={i} style={st.weekDayCol}>
            <View style={[st.weekDayCircle, { backgroundColor, borderColor, borderWidth: borderColor === 'transparent' ? 0 : 1.5 }]}>
              {completed ? (
                <Ionicons name="heart" size={16} color={colors.wrong} />
              ) : isToday ? (
                <View style={[st.todayPulse, { backgroundColor: colors.gold }]} />
              ) : (
                <View style={[st.futureDot, { backgroundColor: colors.textLight }]} />
              )}
            </View>
            <Text style={[st.weekDayLabel, { color: isToday ? colors.text : completed ? colors.wrong : colors.textLight, fontWeight: isToday ? '800' : '600' }]}>{d}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Milestone timeline node ────────────────────────────────────────
// Four states: claimed (green check), reachable + unclaimed (gold gift,
// pulsing, tappable), next unreached (coral with progress bar, pulsing
// outer ring), future (dimmed). Tapping a reachable node fires the
// claim animation: card scale-bounce + gold flash + reward icons fly up
// + fade out, then promoting to claimed.
function MilestoneNode({
  milestone,
  claimed,
  reachableUnclaim,
  isNext,
  currentStreak,
  colors,
  userId,
  onClaimed,
}: {
  milestone: StreakMilestone;
  claimed: boolean;
  reachableUnclaim: boolean;
  isNext: boolean;
  currentStreak: number;
  colors: any;
  userId: string | null;
  onClaimed: (claimedAt: string) => void;
}) {
  const reached = currentStreak >= milestone.day;
  const progress = Math.min(1, currentStreak / milestone.day);
  // Future milestones dim to 45% — past unclaimed milestones stay at full
  // opacity to draw the eye toward the claimable rewards.
  const opacity = reached || isNext ? 1 : 0.45;

  // Pulse glow on next OR reachable-unclaimed indicators (both want attention)
  const pulse = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (!(isNext || reachableUnclaim) || isWeb) return;
    const loop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [isNext, reachableUnclaim, pulse]);

  // Per-tap claim animation state ──────────────────────────────────────
  // cardScale: brief 1.05 bounce + settle
  // glow: 0 → 1 → 0 (gold border flash)
  // burstY / burstOpacity: reward icon burst that floats upward + fades
  const cardScale = useRef(new RNAnimated.Value(1)).current;
  const glow = useRef(new RNAnimated.Value(0)).current;
  const burstY = useRef(new RNAnimated.Value(0)).current;
  const burstOpacity = useRef(new RNAnimated.Value(0)).current;
  const [claiming, setClaiming] = useState(false);

  const onTap = async () => {
    if (!reachableUnclaim || !userId || claiming) return;
    setClaiming(true);
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Fire the visual burst BEFORE the network call so it feels instant
    burstY.setValue(0);
    burstOpacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.spring(cardScale, { toValue: 1.05, friction: 6, tension: 200, useNativeDriver: true }),
        RNAnimated.spring(cardScale, { toValue: 1, friction: 8, tension: 160, useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      RNAnimated.timing(burstY, { toValue: -80, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(burstOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    const result = await claimSingleMilestone(userId, milestone.day, currentStreak);
    if (result) {
      onClaimed(result.claimedAt);
    } else {
      // Server-side failure (already claimed by another device, network) —
      // reset UI so the player isn't stuck in a fake-claimed state.
      setClaiming(false);
    }
  };

  // Wrap the row in Pressable only when it's tappable to avoid changing
  // hit-test behavior for non-interactive nodes.
  const Wrapper: any = reachableUnclaim ? Pressable : View;
  const wrapperProps = reachableUnclaim
    ? {
        onPress: onTap,
        accessibilityRole: 'button' as const,
        accessibilityLabel: `Claim Day ${milestone.day} reward: ${milestone.gems} gems${milestone.shields > 0 ? ` and ${milestone.shields} shields` : ''}`,
      }
    : {};

  return (
    <Wrapper {...wrapperProps} style={[st.nodeRow, { opacity }]}>
      {/* Timeline dot */}
      <RNAnimated.View
        style={[
          st.nodeDot,
          {
            backgroundColor: claimed
              ? colors.correct
              : reachableUnclaim
              ? colors.gold
              : isNext
              ? colors.wrongSoft
              : reached
              ? colors.wrong
              : colors.surface,
            borderColor: isNext ? colors.wrong : reachableUnclaim ? colors.gold : 'transparent',
            borderWidth: isNext || reachableUnclaim ? 2 : 0,
            transform: (isNext || reachableUnclaim) ? [{ scale: pulse }] : undefined,
          },
        ]}
      >
        {claimed ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : reachableUnclaim ? (
          <Text style={st.giftEmoji}>{GIFT}</Text>
        ) : reached ? (
          <Text style={st.giftEmoji}>{GIFT}</Text>
        ) : (
          <Text style={[st.nodeDay, { color: colors.textLight }]}>{milestone.day}</Text>
        )}
      </RNAnimated.View>

      {/* Card with claim animation */}
      <RNAnimated.View
        style={[
          st.nodeCard,
          {
            backgroundColor: claimed ? colors.correctSoft : colors.card,
            borderColor: reachableUnclaim
              ? colors.gold + '50'
              : isNext
              ? colors.wrong + '20'
              : claimed
              ? colors.correct + '15'
              : colors.border,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        {/* Animated gold glow overlay — pulses during claim animation */}
        <RNAnimated.View
          pointerEvents="none"
          style={[
            st.cardGlow,
            {
              borderColor: colors.gold,
              opacity: glow,
            },
          ]}
        />

        <View style={st.nodeHeader}>
          <Text
            style={[
              st.nodeDayLabel,
              {
                color: claimed
                  ? colors.correct
                  : reachableUnclaim
                  ? colors.gold
                  : isNext
                  ? colors.wrong
                  : colors.text,
              },
            ]}
          >
            Day {milestone.day}
          </Text>
          {reachableUnclaim && !claiming && (
            <View style={[st.nodeBadge, { backgroundColor: colors.goldSoft }]}>
              <Text style={[st.nodeBadgeText, { color: colors.gold }]}>{GIFT} TAP TO CLAIM</Text>
            </View>
          )}
          {isNext && (
            <View style={[st.nodeBadge, { backgroundColor: colors.wrongSoft }]}>
              <Text style={[st.nodeBadgeText, { color: colors.wrong }]}>
                {milestone.day - currentStreak} DAYS AWAY
              </Text>
            </View>
          )}
          {claimed && (
            <View style={[st.nodeBadge, { backgroundColor: colors.correctSoft }]}>
              <Text style={[st.nodeBadgeText, { color: colors.correct }]}>CLAIMED</Text>
            </View>
          )}
        </View>

        <View style={st.rewardPills}>
          <View style={[st.rewardPill, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="diamond" size={10} color={colors.accent} />
            <Text style={[st.rewardPillText, { color: colors.accent }]}>{milestone.gems}</Text>
          </View>
          {milestone.shields > 0 && (
            <View style={[st.rewardPill, { backgroundColor: colors.wrongSoft }]}>
              <Text style={st.rewardPillEmoji}>{SHIELD}</Text>
              <Text style={[st.rewardPillText, { color: colors.wrong }]}>×{milestone.shields}</Text>
            </View>
          )}
        </View>

        {isNext && (
          <View style={st.progressWrap}>
            <View style={[st.progressTrack, { backgroundColor: colors.wrongSoft }]}>
              <View style={[st.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.wrong }]} />
            </View>
            <View style={st.progressLabels}>
              <Text style={[st.progressLabel, { color: colors.textLight }]}>Day {currentStreak}</Text>
              <Text style={[st.progressLabel, { color: colors.textLight }]}>Day {milestone.day}</Text>
            </View>
          </View>
        )}

        {/* Floating reward burst — reward icons fly up + fade out on claim */}
        {claiming && (
          <RNAnimated.View
            pointerEvents="none"
            style={[
              st.burstWrap,
              { opacity: burstOpacity, transform: [{ translateY: burstY }] },
            ]}
          >
            <View style={[st.burstPill, { backgroundColor: colors.accent }]}>
              <Ionicons name="diamond" size={12} color="#FFFFFF" />
              <Text style={st.burstText}>+{milestone.gems}</Text>
            </View>
            {milestone.shields > 0 && (
              <View style={[st.burstPill, { backgroundColor: colors.wrong }]}>
                <Text style={st.burstShield}>{SHIELD}</Text>
                <Text style={st.burstText}>+{milestone.shields}</Text>
              </View>
            )}
          </RNAnimated.View>
        )}
      </RNAnimated.View>
    </Wrapper>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  bestPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  bestPillText: { fontSize: 10, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, alignItems: 'center' },
  streakNum: { fontSize: 48, fontWeight: '800', lineHeight: 50, marginTop: -2 },
  streakLabel: { fontSize: 13, marginTop: 2 },
  nextPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    marginTop: 10, marginBottom: 16,
  },
  nextPillEmoji: { fontSize: 11 },
  nextPillText: { fontSize: 11, fontWeight: '600' },
  card: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDayCol: { alignItems: 'center', gap: 4 },
  weekDayCircle: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  weekDayLabel: { fontSize: 9 },
  todayPulse: { width: 8, height: 8, borderRadius: 4 },
  futureDot: { width: 6, height: 6, borderRadius: 3 },
  shieldCard: { paddingHorizontal: 14, paddingVertical: 12 },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldEmoji: { fontSize: 22 },
  shieldTitle: { fontSize: 13, fontWeight: '700' },
  shieldDesc: { fontSize: 10, marginTop: 1 },
  shieldCountPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  shieldCount: { fontSize: 14, fontWeight: '800' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, alignSelf: 'flex-start', marginTop: 8, marginBottom: 8 },
  timeline: { width: '100%', gap: 8 },
  // Header row above the timeline — section label + Claim All button
  sectionHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  claimAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  claimAllText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  // Animated gold border ring that flashes during a single claim
  cardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14, borderWidth: 2,
  },
  // Floating reward icons that fly up + fade out on claim
  burstWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  burstPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  burstText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  burstShield: { fontSize: 12 },
  nodeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nodeDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  giftEmoji: { fontSize: 12 },
  nodeDay: { fontSize: 9, fontWeight: '800' },
  nodeCard: {
    flex: 1, padding: 10, borderRadius: 14,
    borderWidth: 1,
  },
  nodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nodeDayLabel: { fontSize: 13, fontWeight: '800' },
  nodeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  nodeBadgeText: { fontSize: 7, fontWeight: '700' },
  rewardPills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rewardPillText: { fontSize: 10, fontWeight: '700' },
  rewardPillEmoji: { fontSize: 9 },
  progressWrap: { marginTop: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  progressLabel: { fontSize: 7 },
});
