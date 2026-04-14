/**
 * Notifications settings screen.
 *
 * Previously lived inline on the main Settings screen as a long list
 * of switches that crowded the page. Moved to its own route so the
 * main screen shows a single "Notifications →" row that navigates
 * here — the pattern the user asked for.
 *
 * Preferences:
 *  - All notifications (master toggle — flips every row at once)
 *  - Individual categories (streak reminders, friend challenges, etc.)
 *
 * Persistence: via loadNotificationPreferences / saveNotificationPreferences
 * which hit Supabase `profiles.notification_preferences` JSONB.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
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

interface NotifCategory {
  key: NotificationPreferenceKey;
  icon: string;
  label: string;
  description: string;
}

const NOTIFICATION_ITEMS: NotifCategory[] = [
  { key: 'streak_reminder', icon: '\uD83D\uDD25', label: 'Streak reminders', description: "Daily nudge when you haven't played yet" },
  { key: 'friend_challenge', icon: '\u2694\uFE0F', label: 'Friend challenges', description: 'When a friend sends you a challenge' },
  { key: 'challenge_result', icon: '\uD83D\uDCCA', label: 'Challenge results', description: "How you did when a friend finishes" },
  { key: 'friend_request', icon: '\uD83D\uDC4B', label: 'Friend requests', description: 'When someone wants to add you' },
  { key: 'friend_online', icon: '\uD83D\uDFE2', label: 'Friend online', description: 'When a friend opens the app' },
  { key: 'lives_full', icon: '\u2764\uFE0F', label: 'Lives full', description: 'When your lives refill to 5' },
  { key: 'achievements', icon: '\uD83C\uDFC5', label: 'Achievements', description: 'When you unlock a new achievement tier' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [masterToggle, setMasterToggle] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadNotificationPreferences(user.id).then((p) => {
      setPrefs(p);
      setMasterToggle(Object.values(p).some((v) => v));
    });
  }, [user?.id]);

  const handleToggle = useCallback((key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    // Recompute the master toggle so it reflects "any enabled".
    setMasterToggle(Object.values(updated).some((v) => v));
    if (user?.id) saveNotificationPreferences(user.id, updated);
  }, [prefs, user?.id]);

  const handleMasterToggle = useCallback((value: boolean) => {
    setMasterToggle(value);
    const updated: Record<string, boolean> = {};
    Object.keys(prefs).forEach((k) => { updated[k] = value; });
    setPrefs(updated);
    if (user?.id) saveNotificationPreferences(user.id, updated);
  }, [prefs, user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to settings"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors.textMid }]}>
          Choose which alerts you want to receive. You can always change these later.
        </Text>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '700' }]}>All notifications</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>Master toggle for everything below</Text>
            </View>
            <Switch
              value={masterToggle}
              onValueChange={handleMasterToggle}
              trackColor={{ true: colors.accent, false: colors.surface }}
            />
          </View>
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>CATEGORIES</Text>
        <Card style={styles.card}>
          {NOTIFICATION_ITEMS.map((item, i) => (
            <React.Fragment key={item.key}>
              <View style={[styles.row, !masterToggle && { opacity: 0.4 }]}>
                <Text style={styles.notifIcon}>{item.icon}</Text>
                <View style={styles.notifText}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.rowHelp, { color: colors.textLight }]}>{item.description}</Text>
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

        <Text style={[styles.footer, { color: colors.textLight }]}>
          To fully silence Blanked, turn notifications off for the app in your device Settings too.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  scroll: { paddingBottom: 40 },
  intro: { fontSize: typography.sizes.md, marginBottom: spacing.lg, lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm, paddingLeft: 4 },
  card: { marginBottom: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm },
  rowLabel: { fontSize: typography.sizes.lg },
  rowHelp: { fontSize: 12, marginTop: 2 },
  notifIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  notifText: { flex: 1 },
  divider: { height: 1, marginVertical: spacing.xs },
  footer: { fontSize: 12, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg, lineHeight: 18 },
});
