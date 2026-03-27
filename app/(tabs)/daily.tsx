import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { getTodayMode, MODE_INFO, getWeekSchedule } from '@/src/types/daily';
import type { DailyMode } from '@/src/types/daily';

const MILESTONES = [
  { days: 7, gems: 50, label: '50 gems', icon: String.fromCodePoint(0x1F48E), extra: null },
  { days: 30, gems: 200, label: '200 gems', icon: String.fromCodePoint(0x1F48E), extra: null },
  { days: 100, gems: 500, label: '500 gems + badge', icon: String.fromCodePoint(0x2B50), extra: 'badge' },
];
const MODE_ROUTES: Record<DailyMode, string> = { classic: '/game/daily', speed: '/game/speed', spot_the_change: '/game/spot' };
const FIRE = String.fromCodePoint(0x1F525);
const LOCK = String.fromCodePoint(0x1F512);

export default function DailyTab() {
  const router = useRouter();
  const { streakCount } = useGameStore();
  const todayMode = getTodayMode();
  const modeInfo = MODE_INFO[todayMode];
  const weekSchedule = getWeekSchedule();
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Daily Challenge</Text>
            <Text style={styles.date}>{todayFormatted}</Text>
          </View>
          {streakCount > 0 && (<View style={styles.streakPill}><Text style={styles.streakIcon}>{FIRE}</Text><Text style={styles.streakCount}>{streakCount}</Text></View>)}
        </View>

        <Card style={styles.modeCard}>
          <View style={styles.modeRow}>
            <Text style={styles.modeIcon}>{modeInfo.icon}</Text>
            <View style={styles.modeTextContainer}>
              <Text style={styles.modeName}>{modeInfo.name}</Text>
              <Text style={styles.modeDescription}>{modeInfo.description}</Text>
            </View>
          </View>
        </Card>

        <Button title={`Start ${modeInfo.name}`} onPress={() => router.push(MODE_ROUTES[todayMode] as any)} style={styles.startButton} textStyle={styles.startButtonText} />

        <View style={styles.weekSection}>
          <Text style={styles.weekTitle}>This week</Text>
          <View style={styles.weekRow}>
            {weekSchedule.map((day) => {
              const dmi = MODE_INFO[day.mode];
              const isPast = day.date < today && !day.isToday;
              return (
                <View key={day.dayShort} style={[styles.dayCard, day.isToday && styles.dayCardToday, isPast && styles.dayCardPast]}>
                  <Text style={[styles.dayName, day.isToday && styles.dayNameToday, isPast && styles.dayNamePast]}>{day.dayShort}</Text>
                  <Text style={[styles.dayIcon, isPast && styles.dayIconPast]}>{dmi.icon}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Card style={styles.milestonesCard}>
          <View style={styles.milestonesTitleRow}>
            <Text style={styles.milestonesTitle}>Streak milestones</Text>
            <View style={styles.milestonesStreakMini}><Text style={styles.milestonesStreakMiniIcon}>{FIRE}</Text><Text style={styles.milestonesStreakMiniText}>{streakCount} / {MILESTONES[0].days}</Text></View>
          </View>
          {MILESTONES.map((m, i) => {
            const done = streakCount >= m.days;
            return (
              <React.Fragment key={m.days}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneDaysContainer}><Text style={[styles.milestoneDays, done && styles.milestoneDaysCompleted]}>{m.days}</Text><Text style={styles.milestoneDaysLabel}>days</Text></View>
                  <View style={styles.milestoneRewardContainer}><Text style={styles.milestoneIcon}>{m.icon}</Text><Text style={styles.milestoneReward}>{m.label}</Text></View>
                  {done ? <View style={styles.completedBadge}><Ionicons name="checkmark" size={14} color={colors.correct} /></View> : <View style={styles.lockedBadge}><Text style={styles.lockedIcon}>{LOCK}</Text></View>}
                </View>
              </React.Fragment>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontWeight: typography.weights.heavy, color: colors.text, letterSpacing: -0.3 },
  date: { fontSize: typography.sizes.md, color: colors.textMid, marginTop: 6 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.goldSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.pill, marginTop: 2 },
  streakIcon: { fontSize: 16 },
  streakCount: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.gold },
  modeCard: { marginBottom: spacing.lg },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modeIcon: { fontSize: 32 },
  modeTextContainer: { flex: 1 },
  modeName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  modeDescription: { fontSize: typography.sizes.md, color: colors.textMid, marginTop: 2 },
  startButton: { backgroundColor: colors.accent, minHeight: 56, borderRadius: borderRadius.lg, marginBottom: spacing.xxl },
  startButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  weekSection: { marginBottom: spacing.xxl },
  weekTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCard: { width: 48, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  dayCardToday: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dayCardPast: { opacity: 0.5 },
  dayName: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.textMid, marginBottom: spacing.xs, textTransform: 'uppercase' },
  dayNameToday: { color: colors.accent },
  dayNamePast: { color: colors.textLight },
  dayIcon: { fontSize: 18 },
  dayIconPast: { opacity: 0.7 },
  milestonesCard: { marginBottom: spacing.lg },
  milestonesTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  milestonesTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  milestonesStreakMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  milestonesStreakMiniIcon: { fontSize: 12 },
  milestonesStreakMiniText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textMid },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  milestoneDaysContainer: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, width: 84 },
  milestoneDays: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.heavy, color: colors.text },
  milestoneDaysCompleted: { color: colors.correct },
  milestoneDaysLabel: { fontSize: typography.sizes.sm, color: colors.textMid, fontWeight: typography.weights.medium },
  milestoneRewardContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  milestoneIcon: { fontSize: 18 },
  milestoneReward: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.gold },
  completedBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.correctSoft, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  lockedIcon: { fontSize: 16 },
});
