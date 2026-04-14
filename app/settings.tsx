import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
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
import { spacing } from '@/src/theme/spacing';
import { restorePurchases } from '@/src/lib/purchases';
import { useGameStore } from '@/src/store';

function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Blanked+ upsell */}
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={() => setShowPaywall(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Blanked Plus subscription"
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
                <Text style={styles.plusSub}>Unlimited lives, no ads, and more</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        {/* Preferences section — notification + sound toggles now each
            get their own dedicated screen so players can configure
            per-category without crowding this main page. */}
        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>PREFERENCES</Text>
        <Card style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push('/settings/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Open notification settings"
          >
            <View style={[styles.navIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>Streaks, challenges, friends, achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push('/settings/sounds')}
            accessibilityRole="button"
            accessibilityLabel="Open sound and haptics settings"
          >
            <View style={[styles.navIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="volume-high-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Sound & haptics</Text>
              <Text style={[styles.rowHelp, { color: colors.textLight }]}>Sound categories, haptic feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.textMid }]}>PURCHASES</Text>
        <Card style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={async () => {
              const status = await restorePurchases();
              if (status.plus) {
                useGameStore.getState().activatePlus();
                Alert.alert('Restored', 'Your Blanked+ subscription has been restored.');
              } else if (status.noAds) {
                Alert.alert('Restored', 'Your ad-free purchase has been restored.');
              } else {
                Alert.alert('Nothing to restore', 'No previous purchases were found for this account.');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>Restore purchases</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.textMid }]}>1.0.0</Text>
          </View>
        </Card>

        {/* Delete account - required by Apple guideline 5.1.1(v) */}
        <Text style={[styles.sectionLabel, { color: colors.textMid, marginTop: 24 }]}>DANGER ZONE</Text>
        <Card style={{ ...styles.card, borderColor: colors.wrong + '20', borderWidth: 1 } as any}>
          <Pressable
            style={styles.row}
            onPress={() => {
              Alert.alert(
                'Delete your account?',
                'This will permanently delete your profile, progress, friends, cosmetics, and all data associated with your account. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete permanently',
                    style: 'destructive',
                    onPress: () => {
                      // Second confirmation for safety
                      Alert.alert(
                        'Are you absolutely sure?',
                        'All your progress, gems, streaks, cosmetics, and friend connections will be lost forever.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Yes, delete everything',
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
                                await supabase.from('daily_results').delete().eq('user_id', userId);
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
                                Alert.alert('Error', 'Could not delete your account. Please try again or contact support.');
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
            accessibilityLabel="Delete account"
          >
            <Ionicons name="trash-outline" size={18} color={colors.wrong} style={{ marginRight: 8 }} />
            <Text style={[styles.rowLabel, { color: colors.wrong, flex: 1 }]}>Delete account</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.wrong + '60'} />
          </Pressable>
        </Card>
      </ScrollView>

      <SubscriptionPaywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        onSubscribe={(plan, trial) => {
          Alert.alert('Blanked+', `${plan === 'yearly' ? 'Yearly' : 'Monthly'} plan selected. IAP available when RevenueCat is configured.`);
          setShowPaywall(false);
        }}
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
});
