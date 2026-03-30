import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
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
  const { colors } = useTheme();
  const { streakCount } = useGameStore();
  const todayMode = getTodayMode();
  const modeInfo = MODE_INFO[todayMode];
  const weekSchedule = getWeekSchedule();
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Daily Challenge</Text>
            <Text style={[styles.date, { color: colors.textMid }]}>{todayFormatted}</Text>
          </View>
          {streakCount > 0 && (<View style={[styles.streakPill, { backgroundColor: colors.goldSoft }]}><Text style={styles.streakIcon}>{FIRE}</Text><Text style={[styles.streakCount, { color: colors.gold }]}>{streakCount}</Text></View>)}
        </View>

        <View style={[styles.modeCard, { backgroundColor: colors.card }]}>
          <View style={styles.modeRow}>
            <Text style={styles.modeIcon}>{modeInfo.icon}</Text>
            <View style={styles.modeTextContainer}>
              <Text style={[styles.modeName, { color: colors.text }]}>{modeInfo.name}</Text>
              <Text style={[styles.modeDescription, { color: colors.textMid }]}>{modeInfo.description}</Text>
            </View>
          </View>
        </View>

        <Button title={`Start ${modeInfo.name}`} onPress={() => router.push(MODE_ROUTES[todayMode] as any)} style={[styles.startButton, { backgroundColor: colors.accent }]} textStyle={styles.startButtonText} />

        <View style={styles.weekSection}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>This week</Text>
          <View style={styles.weekRow}>
            {weekSchedule.map((day) => {
              const dmi = MODE_INFO[day.mode];
              const isPast = day.date < today && !day.isToday;
              return (
                <View key={day.dayShort} style={[styles.dayCard, { backgroundColor: colors.card }, day.isToday && { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft }, isPast && { opacity: 0.5 }]}>
                  <Text style={[styles.dayName, { color: colors.textMid }, day.isToday && { color: colors.accent }, isPast && { color: colors.textLight }]}>{day.dayShort}</Text>
                  <Text style={[styles.dayIcon, isPast && { opacity: 0.7 }]}>{dmi.icon}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.milestonesCard, { backgroundColor: colors.card }]}>
          <View style={styles.milestonesTitleRow}>
            <Text style={[styles.milestonesTitle, { color: colors.text }]}>Streak milestones</Text>
            <View style={styles.milestonesStreakMini}><Text style={styles.milestonesStreakMiniIcon}>{FIRE}</Text><Text style={[styles.milestonesStreakMiniText, { color: colors.textMid }]}>{streakCount} / {MILESTONES[0].days}</Text></View>
          </View>
          {MILESTONES.map((m, i) => {
            const done = streakCount >= m.days;
            return (
              <React.Fragment key={m.days}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneDaysContainer}><Text style={[styles.milestoneDays, { color: colors.text }, done && { color: colors.correct }]}>{m.days}</Text><Text style={[styles.milestoneDaysLabel, { color: colors.textMid }]}>days</Text></View>
                  <View style={styles.milestoneRewardContainer}><Text style={styles.milestoneIcon}>{m.icon}</Text><Text style={[styles.milestoneReward, { color: colors.gold }]}>{m.label}</Text></View>
                  {done ? <View style={[styles.completedBadge, { backgroundColor: colors.correctSoft }]}><Ionicons name="checkmark" size={14} color={colors.correct} /></View> : <View style={styles.lockedBadge}><Text style={styles.lockedIcon}>{LOCK}</Text></View>}
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontWeight: typography.weights.heavy, letterSpacing: -0.3 },
  date: { fontSize: typography.sizes.md, marginTop: 6 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.pill, marginTop: 2 },
  streakIcon: { fontSize: 16 },
  streakCount: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  modeCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modeIcon: { fontSize: 32 },
  modeTextContainer: { flex: 1 },
  modeName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  modeDescription: { fontSize: typography.sizes.md, marginTop: 2 },
  startButton: { minHeight: 56, borderRadius: borderRadius.lg, marginBottom: spacing.xxl },
  startButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  weekSection: { marginBottom: spacing.xxl },
  weekTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginBottom: spacing.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCard: { width: 48, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  dayName: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.xs, textTransform: 'uppercase' },
  dayIcon: { fontSize: 18 },
  milestonesCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  milestonesTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  milestonesTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  milestonesStreakMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  milestonesStreakMiniIcon: { fontSize: 12 },
  milestonesStreakMiniText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  divider: { height: 1, marginVertical: spacing.xs },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  milestoneDaysContainer: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, width: 84 },
  milestoneDays: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.heavy },
  milestoneDaysLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  milestoneRewardContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  milestoneIcon: { fontSize: 18 },
  milestoneReward: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  completedBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  lockedIcon: { fontSize: 16 },
});
