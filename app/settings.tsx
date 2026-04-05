import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferenceKey,
} from '@/src/utils/notifications';

const NOTIFICATION_ITEMS: { key: NotificationPreferenceKey; icon: string; label: string }[] = [
  { key: 'streak_reminder', icon: '\uD83D\uDD25', label: 'Streak reminders' },
  { key: 'friend_challenge', icon: '\u2694\uFE0F', label: 'Friend challenges' },
  { key: 'challenge_result', icon: '\uD83D\uDCCA', label: 'Challenge results' },
  { key: 'friend_request', icon: '\uD83D\uDC4B', label: 'Friend requests' },
  { key: 'friend_online', icon: '\uD83D\uDFE2', label: 'Friend online' },
  { key: 'lives_full', icon: '\u2764\uFE0F', label: 'Lives full' },
  { key: 'achievements', icon: '\uD83C\uDFC5', label: 'Achievements' },
];

function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [masterToggle, setMasterToggle] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadNotificationPreferences(user.id).then(p => {
      setPrefs(p);
      setMasterToggle(Object.values(p).some(v => v));
    });
  }, [user?.id]);

  const handleToggle = useCallback((key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    if (user?.id) saveNotificationPreferences(user.id, updated);
  }, [prefs, user?.id]);

  const handleMasterToggle = useCallback((value: boolean) => {
    setMasterToggle(value);
    const updated: Record<string, boolean> = {};
    Object.keys(prefs).forEach(k => { updated[k] = value; });
    setPrefs(updated);
    if (user?.id) saveNotificationPreferences(user.id, updated);
  }, [prefs, user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Sound effects</Text>
            <Switch value={true} trackColor={{ true: colors.accent, false: colors.surface }} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic feedback</Text>
            <Switch value={true} trackColor={{ true: colors.accent, false: colors.surface }} />
          </View>
        </Card>

        {/* Notification Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>NOTIFICATIONS</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '700' }]}>All notifications</Text>
            <Switch
              value={masterToggle}
              onValueChange={handleMasterToggle}
              trackColor={{ true: colors.accent, false: colors.surface }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {NOTIFICATION_ITEMS.map((item, i) => (
            <React.Fragment key={item.key}>
              <View style={[styles.row, !masterToggle && { opacity: 0.4 }]}>
                <View style={styles.notifRow}>
                  <Text style={styles.notifIcon}>{item.icon}</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                </View>
                <Switch
                  value={prefs[item.key] ?? true}
                  onValueChange={(v) => handleToggle(item.key, v)}
                  disabled={!masterToggle}
                  trackColor={{ true: colors.accent, false: colors.surface }}
                />
              </View>
              {i < NOTIFICATION_ITEMS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.textMid }]}>1.0.0</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  spacer: { width: 60 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm, paddingLeft: 4 },
  card: { marginBottom: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rowLabel: { fontSize: typography.sizes.lg },
  rowValue: { fontSize: typography.sizes.md },
  divider: { height: 1, marginVertical: spacing.xs },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifIcon: { fontSize: 16, width: 24, textAlign: 'center' },
});
