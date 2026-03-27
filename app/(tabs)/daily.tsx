import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { StreakBadge } from '@/src/components/StreakBadge';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

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
      <Text style={styles.title}>Daily challenge</Text>
      <Text style={styles.date}>{today}</Text>

      <Card style={styles.card}>
        <View style={styles.streakRow}>
          <Text style={styles.streakLabel}>Current streak</Text>
          <StreakBadge streak={streakCount} />
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>5 scenes, 5 questions each</Text>
          <Text style={styles.infoBody}>
            The same challenge for every player worldwide. Complete it to
            keep your streak alive and earn bonus gems.
          </Text>
        </View>

        <Button title="Start today's challenge" onPress={() => {}} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.milestonesTitle}>Streak milestones</Text>
        <View style={styles.milestone}>
          <Text style={styles.milestoneText}>7 days</Text>
          <Text style={styles.milestoneReward}>50 gems</Text>
        </View>
        <View style={styles.milestone}>
          <Text style={styles.milestoneText}>30 days</Text>
          <Text style={styles.milestoneReward}>200 gems</Text>
        </View>
        <View style={styles.milestone}>
          <Text style={styles.milestoneText}>100 days</Text>
          <Text style={styles.milestoneReward}>500 gems + badge</Text>
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingTop: spacing.lg,
  },
  date: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  info: {
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  infoBody: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
    lineHeight: 20,
  },
  milestonesTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  milestone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  milestoneText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  milestoneReward: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gold,
  },
});
