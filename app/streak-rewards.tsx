/**
 * Streak Rewards screen — full progression view linked from the home
 * screen's streak card. Shows:
 *   • Hero: Blink (streak expression) + count + "next reward" pill
 *   • This-week calendar with played/today/future states
 *   • Streak Shields card with current count
 *   • Vertical milestone timeline (claimed / next / future states)
 *
 * Data: Supabase-backed claims via getStreakRewards(). Best streak read
 * from the local store (synced from profiles.best_streak).
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
import { getStreakRewards, type StreakRewardRow } from '@/src/utils/streakRewards';

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
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getStreakRewards(user.id).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Build a `claimed` lookup the milestone nodes use to decide their state
  const claimedByDay = new Map<number, boolean>();
  for (const r of rows) claimedByDay.set(r.milestone_day, r.claimed);

  // Find the next milestone — first unclaimed in spec order
  const nextMilestone: StreakMilestone | null =
    STREAK_MILESTONES.find((m) => !claimedByDay.get(m.day)) ?? null;
  const daysToNext = nextMilestone ? Math.max(0, nextMilestone.day - streakCount) : 0;

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

      <ScrollView contentContainerStyle={st.scroll}>
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
        <Text style={[st.sectionLabel, { color: colors.textLight }]}>STREAK REWARDS</Text>
        <View style={st.timeline}>
          {STREAK_MILESTONES.map((m) => {
            const claimed = claimedByDay.get(m.day) === true;
            const isNext = !claimed && nextMilestone?.day === m.day;
            return (
              <MilestoneNode
                key={m.day}
                milestone={m}
                claimed={claimed}
                isNext={isNext}
                currentStreak={streakCount}
                colors={colors}
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
function MilestoneNode({
  milestone,
  claimed,
  isNext,
  currentStreak,
  colors,
}: {
  milestone: StreakMilestone;
  claimed: boolean;
  isNext: boolean;
  currentStreak: number;
  colors: any;
}) {
  const reached = currentStreak >= milestone.day;
  const progress = Math.min(1, currentStreak / milestone.day);
  const opacity = reached || isNext ? 1 : 0.45;

  // Pulse glow on the "next" indicator
  const pulse = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (!isNext || isWeb) return;
    const loop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [isNext, pulse]);

  return (
    <View style={[st.nodeRow, { opacity }]}>
      {/* Timeline dot */}
      <RNAnimated.View
        style={[
          st.nodeDot,
          {
            backgroundColor: claimed ? colors.correct : isNext ? colors.wrongSoft : reached ? colors.wrong : colors.surface,
            borderColor: isNext ? colors.wrong : 'transparent',
            borderWidth: isNext ? 2 : 0,
            transform: isNext ? [{ scale: pulse }] : undefined,
          },
        ]}
      >
        {claimed ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : reached ? (
          <Text style={st.giftEmoji}>{GIFT}</Text>
        ) : (
          <Text style={[st.nodeDay, { color: colors.textLight }]}>{milestone.day}</Text>
        )}
      </RNAnimated.View>

      {/* Card */}
      <View
        style={[
          st.nodeCard,
          {
            backgroundColor: isNext ? colors.card : claimed ? colors.correctSoft : colors.card,
            borderColor: isNext ? colors.wrong + '20' : claimed ? colors.correct + '15' : colors.border,
          },
        ]}
      >
        <View style={st.nodeHeader}>
          <Text style={[st.nodeDayLabel, { color: claimed ? colors.correct : isNext ? colors.wrong : colors.text }]}>
            Day {milestone.day}
          </Text>
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
      </View>
    </View>
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
