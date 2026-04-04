import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { AchievementIcon } from '@/src/components/AchievementIcon';
import { AchievementDetail } from '@/src/components/AchievementDetail';
import { loadAllAchievements, loadPlayerProgress, TIER_COLORS, getHighestUnlockedTier, countUnlockedTiers, type Achievement, type PlayerAchievement, type AchievementTier } from '@/src/utils/achievements';

function loadProfilePic(): string | null {
  try { return localStorage.getItem('blanked-profile-pic'); } catch { return null; }
}
function saveProfilePic(uri: string | null) {
  try { if (uri) localStorage.setItem('blanked-profile-pic', uri); else localStorage.removeItem('blanked-profile-pic'); } catch {}
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, isDark, isManual, toggleTheme, resetToSystem } = useTheme();
  const { totalStars, streakCount, getCompletedLevelCount, getMemoryScore } = useGameStore();
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const email = user?.email || 'Guest';
  const initials = displayName.slice(0, 2).toUpperCase();
  const [profilePic, setProfilePic] = useState<string | null>(loadProfilePic);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerProgress, setPlayerProgress] = useState<Record<string, PlayerAchievement>>({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAllAchievements().then(setAchievements);
    if (user?.id) loadPlayerProgress(user.id).then(setPlayerProgress);
  }, [user?.id]);

  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);
  const unlockedCount = countUnlockedTiers(playerProgress);
  const totalTiers = achievements.length * 3;

  const handlePickPhoto = useCallback(() => {
    if (Platform.OS === 'web') {
      // Web: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const uri = reader.result as string;
          setProfilePic(uri);
          saveProfilePic(uri);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert('Coming soon', 'Photo picker will be available on mobile devices.');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      // Small delay to let auth state clear before navigating
      setTimeout(() => router.replace('/(auth)/login'), 200);
    } catch {
      router.replace('/(auth)/login');
    }
  }, [signOut, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.avatarSection}>
          <Pressable onPress={handlePickPhoto} style={styles.avatarContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={[styles.avatar, { backgroundColor: colors.surface }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={[styles.cameraButton, { backgroundColor: colors.card, borderColor: colors.bg }]}>
              <Ionicons name="camera" size={14} color={colors.accent} />
            </View>
          </Pressable>
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

        {/* Achievements */}
        {achievements.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <View style={styles.achievementHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMid, marginTop: 0, marginBottom: 0 }]}>ACHIEVEMENTS</Text>
              <Text style={[styles.achievementCount, { color: colors.textLight }]}>{unlockedCount}/{totalTiers}</Text>
            </View>

            {/* Category pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
              {[
                { id: 'all', label: 'All' },
                { id: 'campaign', label: 'Campaign' },
                { id: 'daily', label: 'Daily' },
                { id: 'social', label: 'Social' },
                { id: 'streak', label: 'Streak' },
                { id: 'mastery', label: 'Mastery' },
              ].map(cat => (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryPill, { backgroundColor: activeCategory === cat.id ? colors.accent : colors.card }]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text style={[styles.categoryPillText, { color: activeCategory === cat.id ? '#FFF' : colors.textMid }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Achievement grid */}
            <View style={styles.achievementGrid}>
              {filteredAchievements.map(achievement => {
                const progress = playerProgress[achievement.id];
                const tiers: AchievementTier[] = achievement.tiers;
                const currentProgress = progress?.current_progress ?? 0;
                const highestTier = getHighestUnlockedTier(progress);
                const nextTier = tiers.find(t => !progress?.[`${t.tier}_unlocked_at` as keyof PlayerAchievement]);
                const accentColor = highestTier ? TIER_COLORS[highestTier] : TIER_COLORS.none;

                return (
                  <Pressable
                    key={achievement.id}
                    style={[styles.achievementCard, {
                      backgroundColor: colors.card,
                      borderWidth: highestTier ? 1.5 : 1,
                      borderColor: accentColor,
                    }]}
                    onPress={() => setSelectedAchievement(achievement)}
                  >
                    <View style={[styles.achIconBg, { backgroundColor: highestTier ? `${accentColor}15` : 'rgba(0,0,0,0.03)' }]}>
                      <AchievementIcon name={achievement.icon} color={highestTier ? accentColor : '#B2BEC3'} size={22} />
                    </View>
                    <Text style={[styles.achName, { color: highestTier ? colors.text : colors.textMid }]} numberOfLines={1}>{achievement.name}</Text>
                    <View style={styles.tierDots}>
                      {tiers.map((t, i) => (
                        <View key={i} style={[styles.tierDotSmall, { backgroundColor: progress?.[`${t.tier}_unlocked_at` as keyof PlayerAchievement] ? TIER_COLORS[t.tier] : colors.border }]} />
                      ))}
                    </View>
                    {nextTier ? (
                      <Text style={[styles.achProgress, { color: colors.textLight }]}>{currentProgress}/{nextTier.target}</Text>
                    ) : (
                      <Text style={[styles.achComplete, { color: '#D4A012' }]}>COMPLETE {'\u2713'}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Achievement detail popup */}
        <AchievementDetail
          visible={!!selectedAchievement}
          achievement={selectedAchievement}
          progress={selectedAchievement ? playerProgress[selectedAchievement.id] : undefined}
          onClose={() => setSelectedAchievement(null)}
        />

        {/* Appearance */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>APPEARANCE</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(124,108,247,0.12)' : colors.accentSoft }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Dark mode</Text>
                  <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 1 }}>{isManual ? 'Manual' : 'Following system'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: colors.accent, false: colors.surface }}
                thumbColor="#FFFFFF"
              />
            </View>
            {isManual && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Pressable style={styles.settingsRow} onPress={resetToSystem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name="sync" size={16} color={colors.textMid} />
                    </View>
                    <Text style={[styles.settingsLabel, { color: colors.textMid, fontSize: 13 }]}>Reset to system default</Text>
                  </View>
                </Pressable>
              </>
            )}
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
            <Pressable style={styles.settingsRow}>
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
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.settingsRow}>
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
            </Pressable>
          </View>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
          <Text style={[styles.sectionTitle, { color: colors.textMid }]}>ACCOUNT</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.settingsRow} onPress={handleSignOut}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.wrongSoft }]}>
                  <Ionicons name="log-out" size={18} color={colors.wrong} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.wrong }]}>Sign out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textLight }]}>BLANKED v1.0.0</Text>
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
  backButton: { width: 40, height: 40, minWidth: 44, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  headerSpacer: { width: 40 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.xxl },
  avatarContainer: { position: 'relative' as const, marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  cameraButton: { position: 'absolute' as const, bottom: 0, right: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 2 },
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

  // Achievements
  achievementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm, paddingLeft: spacing.xs },
  achievementCount: { fontSize: 12, fontWeight: '600' },
  categoryScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.lg },
  categoryScrollContent: { paddingHorizontal: spacing.lg, gap: 6 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  categoryPillText: { fontSize: 12, fontWeight: '600' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: { width: '47%', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  achIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  achName: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tierDots: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  tierDotSmall: { width: 8, height: 8, borderRadius: 4 },
  achProgress: { fontSize: 10, fontWeight: '500' },
  achComplete: { fontSize: 10, fontWeight: '700' },
});
