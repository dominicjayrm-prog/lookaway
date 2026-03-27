import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';

const MILESTONES = [
  { days: 7, gems: 50, label: '50 gems', icon: '💎', extra: null },
  { days: 30, gems: 200, label: '200 gems', icon: '💎', extra: null },
  { days: 100, gems: 500, label: '500 gems + badge', icon: '⭐', extra: 'badge' },
];

export default function DailyTab() {
  const { streakCount } = useGameStore();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Daily Challenge</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          {streakCount > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakCount}>{streakCount}</Text>
            </View>
          )}
        </View>

        {/* Main challenge card */}
        <Card style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.calendarIconContainer}>
              <Ionicons name="calendar" size={28} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>Today's challenge</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="images-outline" size={15} color={colors.accent} />
              <Text style={styles.statPillText}>5 scenes</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="help-circle-outline" size={15} color={colors.accent} />
              <Text style={styles.statPillText}>25 questions</Text>
            </View>
          </View>

          <View style={styles.worldwideRow}>
            <Ionicons name="globe-outline" size={16} color={colors.textMid} />
            <Text style={styles.worldwideText}>Same challenge worldwide</Text>
          </View>

          <Button
            title="Start today's challenge"
            onPress={() => {}}
            style={styles.startButton}
            textStyle={styles.startButtonText}
          />
        </Card>

        {/* Streak milestones */}
        <Card style={styles.milestonesCard}>
          <View style={styles.milestonesTitleRow}>
            <Text style={styles.milestonesTitle}>Streak milestones</Text>
            <View style={styles.milestonesStreakMini}>
              <Text style={styles.milestonesStreakMiniIcon}>🔥</Text>
              <Text style={styles.milestonesStreakMiniText}>
                {streakCount} / {MILESTONES[0].days}
              </Text>
            </View>
          </View>

          {MILESTONES.map((milestone, index) => {
            const isCompleted = streakCount >= milestone.days;
            return (
              <React.Fragment key={milestone.days}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneDaysContainer}>
                    <Text
                      style={[
                        styles.milestoneDays,
                        isCompleted && styles.milestoneDaysCompleted,
                      ]}
                    >
                      {milestone.days}
                    </Text>
                    <Text style={styles.milestoneDaysLabel}>days</Text>
                  </View>

                  <View style={styles.milestoneRewardContainer}>
                    <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
                    <Text style={styles.milestoneReward}>{milestone.label}</Text>
                  </View>

                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.correct} />
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedIcon}>🔒</Text>
                    </View>
                  )}
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
  mainCard: { marginBottom: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  calendarIconContainer: { width: 48, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.pill },
  statPillText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.accent },
  worldwideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  worldwideText: { fontSize: typography.sizes.md, color: colors.textMid },
  startButton: { backgroundColor: colors.accent, minHeight: 56, borderRadius: borderRadius.lg },
  startButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
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
