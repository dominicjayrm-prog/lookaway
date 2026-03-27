import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { GemCounter } from '@/src/components/GemCounter';
import { LivesIndicator } from '@/src/components/LivesIndicator';
import { StreakBadge } from '@/src/components/StreakBadge';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function PlayTab() {
  const router = useRouter();
  const { gems, lives, streakCount } = useGameStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LivesIndicator lives={lives} />
        <View style={styles.headerRight}>
          <StreakBadge streak={streakCount} />
          <GemCounter count={gems} />
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.logo}>LOOKAWAY</Text>
        <Text style={styles.tagline}>Memorise. Look away. Answer.</Text>
      </View>

      {/* Quick play */}
      <Card style={styles.playCard}>
        <Text style={styles.playLabel}>CONTINUE</Text>
        <Text style={styles.playTitle}>World 1 \u2014 Level 1</Text>
        <Text style={styles.playSubtitle}>Shape basics</Text>
        <Button
          title="Play"
          onPress={() => router.push('/game/w1-l1')}
          style={styles.playButton}
        />
      </Card>

      {/* Daily challenge teaser */}
      <Card style={styles.dailyCard}>
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyLabel}>DAILY CHALLENGE</Text>
          <Text style={styles.dailyDate}>
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Button
          title="Play today's challenge"
          variant="secondary"
          onPress={() => router.push('/(tabs)/daily')}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  logo: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    color: colors.text,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
    marginTop: spacing.sm,
  },
  playCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  playLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textLight,
    letterSpacing: 1,
  },
  playTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  playSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
  },
  playButton: {
    marginTop: spacing.sm,
  },
  dailyCard: {
    gap: spacing.md,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.gold,
    letterSpacing: 1,
  },
  dailyDate: {
    fontSize: typography.sizes.sm,
    color: colors.textMid,
  },
});
