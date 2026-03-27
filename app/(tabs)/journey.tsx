import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import { ProgressBar } from '@/src/components/ProgressBar';
import { Button } from '@/src/components/Button';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';

const WORLDS = [
  { id: 1, name: 'Shape Basics', levels: 35, unlocked: true, progress: 0 },
  { id: 2, name: 'Colour & Position', levels: 35, unlocked: false, progress: 0 },
  { id: 3, name: 'Numbers & Letters', levels: 35, unlocked: false, progress: 0 },
  { id: 4, name: 'Moving Objects', levels: 35, unlocked: false, progress: 0 },
  { id: 5, name: 'Real Scenes', levels: 30, unlocked: false, progress: 0 },
  { id: 6, name: 'Master Challenge', levels: 30, unlocked: false, progress: 0 },
];

export default function JourneyTab() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Journey</Text>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {WORLDS.map((world) => (
          <Card key={world.id} style={styles.worldCard}>
            <View style={styles.worldHeader}>
              <Badge
                label={`WORLD ${world.id}`}
                color={world.unlocked ? colors.accent : colors.textLight}
                bgColor={world.unlocked ? colors.accentSoft : colors.surface}
              />
              {!world.unlocked && (
                <Text style={styles.locked}>\uD83D\uDD12</Text>
              )}
            </View>
            <Text
              style={[
                styles.worldName,
                !world.unlocked && styles.lockedText,
              ]}
            >
              {world.name}
            </Text>
            <Text style={styles.levelCount}>
              {world.levels} levels
            </Text>
            <ProgressBar
              progress={world.progress}
              color={world.unlocked ? colors.accent : colors.textLight}
              style={styles.progress}
            />
            {world.unlocked && (
              <Button
                title="Continue"
                variant="secondary"
                onPress={() => router.push('/game/w1-l1')}
                style={styles.worldButton}
              />
            )}
          </Card>
        ))}
      </ScrollView>
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
    paddingVertical: spacing.lg,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  worldCard: {
    gap: spacing.sm,
  },
  worldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  worldName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  lockedText: {
    color: colors.textLight,
  },
  locked: {
    fontSize: 16,
  },
  levelCount: {
    fontSize: typography.sizes.sm,
    color: colors.textMid,
  },
  progress: {
    marginTop: spacing.xs,
  },
  worldButton: {
    marginTop: spacing.sm,
  },
});
