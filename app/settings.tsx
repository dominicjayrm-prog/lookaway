import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { typography } from '@/src/theme/typography';
import { useGameStore } from '@/src/store';
import { spacing } from '@/src/theme/spacing';
import { restorePurchases } from '@/src/lib/purchases';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { t } from '@/src/i18n';

function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Button title={t('common.back')} variant="ghost" onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Blanked+ upsell */}
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={() => setShowPaywall(true)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.plus.open_aria')}
        >
          <LinearGradient
            colors={['#6C5CE7', '#5B4CC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.plusCard}
          >
            <View style={styles.plusLeft}>
              <View style={styles.plusIcon}>
                <Ionicons name="eye" size={16} color="#6C5CE7" />
              </View>
              <View>
                <Text style={styles.plusTitle}>Blanked<Text style={{ fontWeight: '900' }}>+</Text></Text>
                <Text style={styles.plusSub}>{t('settings.plus.tagline')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        {/* Save-your-account card. Renders only for guest sessions so
            we don't clutter Settings for users who already have a real
            account. Visual treatment is a single-shadow card with a
            heart icon — warm, not alarming. The card itself is the
            CTA: tapping anywhere on it routes to /save-account. */}
        {isGuest && (
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push('/(auth)/save-account')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.guest.save_aria')}
          >
            <Card style={styles.saveAccountCard}>
              <View style={[styles.saveAccountIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="bookmark" size={18} color={colors.accent} />
              </View>
              <View style={styles.saveAccountText}>
                <Text style={[styles.saveAccountTitle, { color: colors.text }]}>{t('settings.guest.save_title')}</Text>
                <Text style={[styles.saveAccountSub, { color: colors.textMid }]}>{t('settings.guest.save_sub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </Card>
          </Pressable>
        )}

        {/* Preferences section — notification + sound toggles now each
            get their own dedicated screen so players can configure
            per-category without crowding this main page. */}
        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{t('settings.preferences.section')}</Text>
        <Card style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push('/settings/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.preferences.notifications.aria')}
          >
            <View style={[styles.navIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.preferences.notifications.title')}</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>{t('settings.preferences.notifications.help')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push('/settings/sounds')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.preferences.sounds.aria')}
          >
            <View style={[styles.navIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="volume-high-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.preferences.sounds.title')}</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>{t('settings.preferences.sounds.help')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.navRow}
            onPress={() => setShowLanguagePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.preferences.language.title')}
          >
            <View style={[styles.navIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="globe-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.preferences.language.title')}</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>{t('settings.preferences.language.help')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{t('settings.purchases.section')}</Text>
        <Card style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={async () => {
              const status = await restorePurchases();
              const store = useGameStore.getState();
              // Sync ALL entitlements that came back, not just plus.
              // Previously the noAds branch surfaced the alert but
              // didn't actually flip ads off in the store, so the
              // user would still see ads after restore.
              if (status.plus) store.activatePlus(status.periodType);
              if (status.noAds) store.setAdsRemoved();

              if (status.plus) {
                Alert.alert(t('settings.purchases.restored_title'), t('settings.purchases.restored_plus'));
              } else if (status.noAds) {
                Alert.alert(t('settings.purchases.restored_title'), t('settings.purchases.restored_ads'));
              } else {
                Alert.alert(t('settings.purchases.nothing_title'), t('settings.purchases.nothing_body'));
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.purchases.restore_aria')}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.purchases.restore')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        </Card>

        <Card style={styles.card}>
          {/* Escape hatch: if a user misses the spotlight tutorial
              on first launch (e.g. they tapped past the Play tab
              too quickly, or the very-first-render measurement
              race skipped it) they can re-trigger it here. Clears
              BOTH the local AsyncStorage flag and the server
              `tutorial_seen` flag so it fires on their next Play
              tab visit. */}
          <Pressable
            style={styles.row}
            onPress={async () => {
              // Clear both the legacy device-global key (may still
              // exist on pre-upgrade installs) and this user's
              // scoped key so the Play tab definitely re-fires the
              // tutorial on next visit.
              try { await AsyncStorage.removeItem('blanked_tutorial_seen'); } catch {}
              if (user?.id) {
                try { await AsyncStorage.removeItem(`blanked_tutorial_seen_${user.id}`); } catch {}
                try {
                  await supabase.from('profiles').update({ tutorial_seen: false }).eq('id', user.id);
                } catch {}
              }
              Alert.alert(
                t('settings.tutorial.reset_title'),
                t('settings.tutorial.reset_body'),
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.tutorial.replay_aria')}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.tutorial.replay')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.version_label')}</Text>
            <Text style={[styles.rowValue, { color: colors.textMid }]}>1.1.0</Text>
          </View>
        </Card>

        {/* Delete account - required by Apple guideline 5.1.1(v) */}
        <Text style={[styles.sectionLabel, { color: colors.textMid, marginTop: 24 }]}>{t('settings.danger.section')}</Text>
        <Card style={{ ...styles.card, borderColor: colors.wrong + '20', borderWidth: 1 } as any}>
          <Pressable
            style={styles.row}
            onPress={() => {
              Alert.alert(
                t('settings.danger.confirm_title'),
                t('settings.danger.confirm_body'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('settings.danger.confirm_cta'),
                    style: 'destructive',
                    onPress: () => {
                      // Second confirmation for safety
                      Alert.alert(
                        t('settings.danger.final_title'),
                        t('settings.danger.final_body'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('settings.danger.final_cta'),
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const userId = user?.id;
                                if (!userId) return;

                                // Delete all user data from Supabase tables
                                await supabase.from('user_progress').delete().eq('user_id', userId);
                                await supabase.from('friend_challenges').delete().or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);
                                await supabase.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
                                await supabase.from('economy_events').delete().eq('user_id', userId);
                                await supabase.from('profiles').delete().eq('id', userId);

                                // Clear all local storage
                                try {
                                  if (typeof localStorage !== 'undefined') {
                                    localStorage.clear();
                                  }
                                } catch {}

                                // Sign out (which also clears the Supabase session)
                                await supabase.auth.signOut();

                                log.breadcrumb('auth', 'account deleted', { userId });
                                router.replace('/(auth)/login');
                              } catch (e) {
                                log.error('settings', 'account deletion failed', e);
                                Alert.alert(t('common.error'), t('settings.danger.failed_body'));
                              }
                            },
                          },
                        ],
                      );
                    },
                  },
                ],
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.danger.delete_account_aria')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.wrong} style={{ marginRight: 8 }} />
            <Text style={[styles.rowLabel, { color: colors.wrong, flex: 1 }]}>{t('settings.danger.delete_account')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.wrong + '60'} />
          </Pressable>
        </Card>

        {__DEV__ && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textLight }]}>DEV</Text>
            <Card style={styles.card}>
              <Pressable
                style={[styles.row, { paddingHorizontal: spacing.md }]}
                onPress={() => useGameStore.getState().setReviewPromptVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('modals.force_review_aria')}
              >
                <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>{t('dev_settings.force_review')}</Text>
                <Ionicons name="star" size={18} color={colors.gold} />
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>

      <SubscriptionPaywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        onSubscribe={(plan) => {
          Alert.alert(
            t('settings.plus.plan_alert_title'),
            plan === 'yearly' ? t('settings.plus.plan_alert_body_yearly') : t('settings.plus.plan_alert_body_monthly'),
          );
          setShowPaywall(false);
        }}
      />

      <LanguagePicker
        visible={showLanguagePicker}
        onDismiss={() => setShowLanguagePicker(false)}
      />
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

  // Navigation rows for the sub-setting screens (Notifications,
  // Sound & haptics). Taller than a plain toggle row so the row
  // description line has breathing room.
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm + 2 },
  navIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navText: { flex: 1 },
  rowHelp: { fontSize: 12, marginTop: 2 },

  // Blanked+ card
  plusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, padding: 14, marginBottom: spacing.lg,
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16,
  },
  plusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plusIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  plusTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  plusSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  // Save-your-account card (guest-only). Same horizontal layout as
  // navRow rows but lifted onto its own Card so it reads as a
  // standalone action rather than a settings entry.
  saveAccountCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: spacing.lg, gap: 12 },
  saveAccountIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveAccountText: { flex: 1, gap: 1 },
  saveAccountTitle: { fontSize: 15, fontWeight: '700' },
  saveAccountSub: { fontSize: 11 },
});
