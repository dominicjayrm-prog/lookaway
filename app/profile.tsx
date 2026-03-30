import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { mode, colors, isDark, toggleTheme } = useTheme();
  const { gems, lives, totalStars, streakCount, getCompletedLevelCount, getMemoryScore } = useGameStore();
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const email = user?.email || 'Guest';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.textMid }]}>{email}</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{completedCount > 0 ? `${memoryScore}%` : '--'}</Text>
              <Text style={[styles.statLabel, { color: colors.textMid }]}>Memory</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{totalStars}</Text>
              <Text style={[styles.statLabel, { color: colors.textMid }]}>Stars</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.wrong }]}>{streakCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMid }]}>Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.correct }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMid }]}>Levels</Text>
            </View>
          </View>
        </Animated.View>

        {/* Appearance */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>APPEARANCE</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(124,108,247,0.12)' : colors.accentSoft }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Dark mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: colors.accent, false: colors.surface }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <SettingsRow icon="volume-high" label="Sound effects" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="phone-portrait" label="Haptic feedback" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="notifications" label="Notifications" colors={colors} />
          </View>
        </Animated.View>

        {/* Social (placeholder) */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>SOCIAL</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="people" size={18} color={colors.blue} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Friends</Text>
              </View>
              <View style={styles.settingsRowRight}>
                <Text style={[styles.comingSoon, { color: colors.textLight }]}>Coming soon</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.goldSoft }]}>
                  <Ionicons name="trophy" size={18} color={colors.gold} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Leaderboard</Text>
              </View>
              <View style={styles.settingsRowRight}>
                <Text style={[styles.comingSoon, { color: colors.textLight }]}>Coming soon</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>ACCOUNT</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}>
                  <Ionicons name="log-out" size={18} color={colors.wrong} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.wrong }]}>Sign out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textLight }]}>LOOKAWAY v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, colors }: { icon: string; label: string; colors: any }) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon as any} size={18} color={colors.accent} />
        </View>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <Switch
        value={true}
        trackColor={{ true: colors.accent, false: colors.surface }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  headerSpacer: { width: 40 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.xxl },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  displayName: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  email: { fontSize: typography.sizes.md },

  statsRow: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xxl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, alignSelf: 'stretch' },

  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm, marginTop: spacing.md, paddingLeft: spacing.xs },

  settingsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingsRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  comingSoon: { fontSize: typography.sizes.xs },
  divider: { height: 1, marginLeft: 62 },

  version: { textAlign: 'center', fontSize: 10, fontWeight: '600', marginTop: spacing.xxl, letterSpacing: 1 },
});
