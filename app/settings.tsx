import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
        />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Sound effects</Text>
          <Switch
            value={true}
            trackColor={{ true: colors.accent, false: colors.surface }}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic feedback</Text>
          <Switch
            value={true}
            trackColor={{ true: colors.accent, false: colors.surface }}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
          <Switch
            value={true}
            trackColor={{ true: colors.accent, false: colors.surface }}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: colors.textMid }]}>1.0.0</Text>
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  spacer: {
    width: 60,
  },
  card: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.sizes.lg,
  },
  rowValue: {
    fontSize: typography.sizes.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
});
