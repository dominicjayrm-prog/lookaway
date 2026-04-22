/**
 * Notifications settings screen — sectioned, rich controls.
 *
 * Sections:
 *  - Enable prompt / status banner (if iOS permission not granted)
 *  - DAILY REMINDER: master toggle + time picker
 *  - STREAK: at-risk, milestone-near
 *  - LIVES: full refill
 *  - CHALLENGES: received, result, declined
 *  - SOCIAL: friend request, accepted, online
 *  - ACHIEVEMENTS: tier unlocks
 *  - WEEKLY: end-of-week reminder
 *  - WIN-BACK: haven't played in 3/7/14 days
 *
 * Also handles the iOS permission flow:
 *  - If permission is granted: show only toggles.
 *  - If permission hasn't been asked yet: show an "Enable
 *    notifications" button at the top that triggers the native
 *    permission prompt AND registers the push token.
 *  - If permission was denied at the OS level: show an "Open iOS
 *    Settings" button that deep-links into the app's settings page
 *    (only way to change permission once denied).
 *
 * Preferences flow:
 *  - Toggles write to profiles.notification_preferences JSONB
 *  - Daily reminder time writes to profiles.daily_reminder_time
 *  - Changing the time instantly reschedules the local daily
 *    notification via scheduleDailyReminder()
 */
import React, { useState, useEffect, useCallback } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable, Platform, Linking, Modal } from 'react-native';
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
  loadDailyReminderTime,
  saveDailyReminderTime,
  scheduleDailyReminder,
  cancelDailyReminder,
  registerPushToken,
  hasNotificationPermission,
  type NotificationPreferenceKey,
} from '@/src/utils/notifications';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'not-asked';

interface NotifRow {
  key: NotificationPreferenceKey;
  icon: string;
  label: string;
  description: string;
}

/** Settings grouped into real sections — matches the reference UX. */
const SECTIONS: { title: string; rows: NotifRow[] }[] = [
  {
    title: 'STREAK',
    rows: [
      { key: 'streak_reminder', icon: '\uD83D\uDD25', label: 'Streak at risk', description: "8pm nudge when you haven't played yet" },
      { key: 'streak_milestone', icon: '\u2B50', label: 'Milestone coming up', description: '"1 more day to reach Day 7!"' },
    ],
  },
  {
    title: 'CHALLENGES',
    rows: [
      { key: 'friend_challenge', icon: '\u2694\uFE0F', label: 'Challenge received', description: 'A friend sent you a challenge' },
      { key: 'challenge_result', icon: '\uD83C\uDFC6', label: 'Result ready', description: 'How you did once your friend finishes' },
      { key: 'challenge_declined', icon: '\uD83D\uDEAB', label: 'Challenge declined', description: 'A friend turned down your challenge' },
    ],
  },
  {
    title: 'SOCIAL',
    rows: [
      { key: 'friend_request', icon: '\uD83D\uDC4B', label: 'Friend requests', description: 'Someone wants to add you' },
      { key: 'friend_request_accepted', icon: '\u2705', label: 'Request accepted', description: 'Your friend request was accepted' },
      { key: 'friend_online', icon: '\uD83D\uDFE2', label: 'Friend online', description: 'A friend just opened the app' },
    ],
  },
  {
    title: 'PROGRESS',
    rows: [
      { key: 'achievements', icon: '\uD83C\uDFC5', label: 'Achievement unlocked', description: 'You hit a new bronze/silver/gold tier' },
      { key: 'lives_full', icon: '\u2764\uFE0F', label: 'Lives refilled', description: 'Your 5 lives are fully recharged' },
      { key: 'weekly_challenge', icon: '\uD83D\uDCC5', label: 'Weekly ends tonight', description: "Last chance to grab this week's gems" },
    ],
  },
  {
    title: 'WIN-BACK',
    rows: [
      { key: 'win_back', icon: '\uD83D\uDCAB', label: "We miss you", description: "Gentle pokes if you haven't played in a few days" },
    ],
  },
];

/** Preset list of reminder times — picker modal. Avoiding
 *  @react-native-community/datetimepicker so we don't take on a
 *  native dependency + EAS rebuild just for this screen. */
const TIME_PRESETS: { hour: number; minute: number }[] = [
  { hour: 7, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 30 },
  { hour: 19, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
  { hour: 22, minute: 0 },
];

function formatTimeHM(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function parseTimeToHM(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return { hour: isNaN(h) ? 20 : h, minute: isNaN(m) ? 0 : m };
}

function serialiseHM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<Record<string, boolean>>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState<number>(20);
  const [reminderMinute, setReminderMinute] = useState<number>(0);
  const [showPicker, setShowPicker] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');

  // Load prefs + daily reminder time + permission state
  useEffect(() => {
    if (!user?.id) return;
    loadNotificationPreferences(user.id).then((p) => {
      setPrefs({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...p });
      setDailyReminderEnabled(p.daily_reminder !== false);
    });
    loadDailyReminderTime(user.id).then((t) => {
      if (t) {
        const { hour, minute } = parseTimeToHM(t);
        setReminderHour(hour);
        setReminderMinute(minute);
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') { setPermissionState('denied'); return; }
    hasNotificationPermission().then((granted) => {
      setPermissionState(granted ? 'granted' : 'not-asked');
    });
  }, []);

  const handleTogglePref = useCallback((key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    if (user?.id) saveNotificationPreferences(user.id, updated);
  }, [prefs, user?.id]);

  const handleToggleDaily = useCallback(async (value: boolean) => {
    setDailyReminderEnabled(value);
    handleTogglePref('daily_reminder', value);
    if (value) {
      const serialised = serialiseHM(reminderHour, reminderMinute);
      await scheduleDailyReminder(serialised);
      if (user?.id) saveDailyReminderTime(user.id, serialised);
    } else {
      await cancelDailyReminder();
      if (user?.id) saveDailyReminderTime(user.id, null);
    }
  }, [reminderHour, reminderMinute, handleTogglePref, user?.id]);

  const handlePickTime = useCallback(async (hour: number, minute: number) => {
    setReminderHour(hour);
    setReminderMinute(minute);
    setShowPicker(false);
    const serialised = serialiseHM(hour, minute);
    await scheduleDailyReminder(serialised);
    if (user?.id) saveDailyReminderTime(user.id, serialised);
  }, [user?.id]);

  const handleEnablePermission = useCallback(async () => {
    if (!user?.id) return;
    const token = await registerPushToken(user.id);
    if (token) {
      setPermissionState('granted');
    } else {
      // Permission was denied — guide user to iOS Settings.
      setPermissionState('denied');
    }
  }, [user?.id]);

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const showPermissionBanner = permissionState === 'not-asked' || permissionState === 'denied';

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
        <Text style={[styles.title, { color: colors.text }]}>{t('notif_settings.title')}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {showPermissionBanner && (
          <Pressable
            onPress={permissionState === 'denied' ? openAppSettings : handleEnablePermission}
            style={[styles.banner, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}
            accessibilityRole="button"
            accessibilityLabel={permissionState === 'denied' ? 'Open iOS settings to enable notifications' : 'Enable notifications'}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.accent }]}>
                {permissionState === 'denied' ? 'Notifications are off' : 'Turn on notifications'}
              </Text>
              <Text style={[styles.bannerBody, { color: colors.textMid }]}>
                {permissionState === 'denied'
                  ? 'Open iOS Settings and enable Notifications for Blanked to receive alerts.'
                  : 'Tap to allow — we only send what you enable below.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{t('notif_settings.daily_section')}</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.emojiIcon}>{'\u23F0'}</Text>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('notif_settings.daily_play')}</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>{t('notif_settings.daily_help')}</Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleToggleDaily}
              trackColor={{ true: colors.accent, false: colors.surface }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => dailyReminderEnabled && setShowPicker(true)}
            style={[styles.row, !dailyReminderEnabled && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={`Change reminder time, currently ${formatTimeHM(reminderHour, reminderMinute)}`}
          >
            <Text style={styles.emojiIcon}>{'\uD83D\uDD52'}</Text>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('notif_settings.remind_at')}</Text>
            </View>
            <Text style={[styles.timeValue, { color: colors.accent }]}>{formatTimeHM(reminderHour, reminderMinute)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>
        </Card>

        {/* Preset time picker modal — fast + no native deps. */}
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.pickerBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
            <View style={[styles.pickerCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('notif_settings.picker_title')}</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {TIME_PRESETS.map((t) => {
                  const isSelected = t.hour === reminderHour && t.minute === reminderMinute;
                  return (
                    <Pressable
                      key={`${t.hour}:${t.minute}`}
                      onPress={() => handlePickTime(t.hour, t.minute)}
                      style={[
                        styles.pickerRow,
                        { backgroundColor: isSelected ? colors.accent + '12' : 'transparent', borderColor: isSelected ? colors.accent : colors.border },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={formatTimeHM(t.hour, t.minute)}
                    >
                      <Text style={[styles.pickerTime, { color: isSelected ? colors.accent : colors.text }]}>
                        {formatTimeHM(t.hour, t.minute)}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                onPress={() => setShowPicker(false)}
                style={[styles.pickerCloseBtn, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.pickerCloseText, { color: colors.textMid }]}>{t('notif_settings.picker_close')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {SECTIONS.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{section.title}</Text>
            <Card style={styles.card}>
              {section.rows.map((item, i) => (
                <React.Fragment key={item.key}>
                  <View style={styles.row}>
                    <Text style={styles.emojiIcon}>{item.icon}</Text>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.rowHelp, { color: colors.textLight }]}>{item.description}</Text>
                    </View>
                    <Switch
                      value={prefs[item.key] ?? true}
                      onValueChange={(v) => handleTogglePref(item.key, v)}
                      trackColor={{ true: colors.accent, false: colors.surface }}
                    />
                  </View>
                  {i < section.rows.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          </React.Fragment>
        ))}

        <Text style={[styles.footer, { color: colors.textLight }]}>
          We send at most 3 push notifications per day to avoid nagging. The daily reminder is a local alert scheduled on-device and does not count toward that limit.
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: spacing.md },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerBody: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm, paddingLeft: 4 },
  card: { marginBottom: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm },
  rowLabel: { fontSize: typography.sizes.md, fontWeight: '600' },
  rowHelp: { fontSize: 12, marginTop: 2 },
  rowText: { flex: 1 },
  emojiIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  timeValue: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: spacing.xs },
  footer: { fontSize: 11, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg, lineHeight: 16 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerCard: { width: '100%', maxWidth: 320, borderRadius: 20, padding: 18, gap: 10 },
  pickerTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 6 },
  pickerTime: { fontSize: 15, fontWeight: '700' },
  pickerCloseBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  pickerCloseText: { fontSize: 14, fontWeight: '700' },
});
