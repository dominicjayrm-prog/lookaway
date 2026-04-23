import React, { useState, useEffect } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { AchievementIcon } from '@/src/components/AchievementIcon';
import { AchievementDetail } from '@/src/components/AchievementDetail';
import { loadAllAchievements, loadPlayerProgress, TIER_COLORS, getHighestUnlockedTier, countUnlockedTiers, type Achievement, type PlayerAchievement, type AchievementTier } from '@/src/utils/achievements';
import { spacing, borderRadius } from '@/src/theme/spacing';

function AchievementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerProgress, setPlayerProgress] = useState<Record<string, PlayerAchievement>>({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAllAchievements().then(setAchievements);
    if (user?.id) loadPlayerProgress(user.id).then(setPlayerProgress);
  }, [user?.id]);

  const filteredAchievements = activeCategory === 'all' ? achievements : achievements.filter(a => a.category === activeCategory);
  const unlockedCount = countUnlockedTiers(playerProgress);
  const totalTiers = achievements.length * 3;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('achievements_page.title')}</Text>
        <Text style={[styles.headerCount, { color: colors.textLight }]}>{unlockedCount}/{totalTiers}</Text>
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
        {[
          { id: 'all', label: t('achievement_detail.cat_all') },
          { id: 'campaign', label: t('achievement_detail.cat_campaign') },
          { id: 'daily', label: t('achievement_detail.cat_daily') },
          { id: 'social', label: t('achievement_detail.cat_social') },
          { id: 'streak', label: t('achievement_detail.cat_streak') },
          { id: 'mastery', label: t('achievement_detail.cat_mastery') },
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
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
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
                <Text style={[styles.achName, { color: highestTier ? colors.text : colors.textMid }]} numberOfLines={1}>
                  {achievement.name}
                </Text>
                <Text style={[styles.achDesc, { color: colors.textLight }]} numberOfLines={1}>
                  {achievement.description}
                </Text>
                <View style={styles.tierDots}>
                  {tiers.map((t, i) => (
                    <View key={i} style={[styles.tierDotSmall, {
                      backgroundColor: progress?.[`${t.tier}_unlocked_at` as keyof PlayerAchievement]
                        ? TIER_COLORS[t.tier] : colors.border,
                    }]} />
                  ))}
                </View>
                {nextTier ? (
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((currentProgress / nextTier.target) * 100))}%`, backgroundColor: accentColor === TIER_COLORS.none ? colors.textLight : accentColor }]} />
                    </View>
                    <Text style={[styles.achProgress, { color: colors.textLight }]}>{currentProgress}/{nextTier.target}</Text>
                  </View>
                ) : (
                  <Text style={[styles.achComplete, { color: '#D4A012' }]}>COMPLETE {'\u2713'}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail popup */}
      <AchievementDetail
        visible={!!selectedAchievement}
        achievement={selectedAchievement}
        progress={selectedAchievement ? playerProgress[selectedAchievement.id] : undefined}
        onClose={() => setSelectedAchievement(null)}
      />
    </SafeAreaView>
  );
}

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { width: 40, height: 40, minWidth: 44, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerCount: { fontSize: 14, fontWeight: '600', marginRight: 4 },

  categoryScroll: { maxHeight: 44, marginBottom: spacing.md, flexGrow: 0 },
  categoryScrollContent: { paddingHorizontal: spacing.lg, gap: 6, alignItems: 'center' },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, height: 36, justifyContent: 'center' },
  categoryPillText: { fontSize: 13, fontWeight: '600' },

  gridContainer: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  achievementCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  achIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  achName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  achDesc: { fontSize: 10, marginBottom: 8 },
  tierDots: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  tierDotSmall: { width: 8, height: 8, borderRadius: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  achProgress: { fontSize: 10, fontWeight: '500' },
  achComplete: { fontSize: 10, fontWeight: '700' },
});
