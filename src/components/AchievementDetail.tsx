import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { AchievementIcon } from './AchievementIcon';
import { TIER_COLORS, getHighestUnlockedTier, type Achievement, type PlayerAchievement, type AchievementTier } from '@/src/utils/achievements';
import { useTheme } from '@/src/providers/ThemeProvider';

interface Props {
  visible: boolean;
  achievement: Achievement | null;
  progress: PlayerAchievement | undefined;
  onClose: () => void;
}

export function AchievementDetail({ visible, achievement, progress, onClose }: Props) {
  const { colors } = useTheme();
  if (!achievement) return null;

  const tiers: AchievementTier[] = achievement.tiers;
  const currentProgress = progress?.current_progress ?? 0;
  const highestTier = getHighestUnlockedTier(progress);
  const borderColor = highestTier ? TIER_COLORS[highestTier] : TIER_COLORS.none;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconBg, { backgroundColor: `${borderColor}15` }]}>
            <AchievementIcon name={achievement.icon} color={highestTier ? TIER_COLORS[highestTier] : '#B2BEC3'} size={32} />
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{achievement.name}</Text>
          <Text style={[styles.desc, { color: colors.textMid }]}>{achievement.description}</Text>

          <View style={styles.tierList}>
            {tiers.map((tier) => {
              const unlockedKey = `${tier.tier}_unlocked_at` as keyof PlayerAchievement;
              const unlockedAt = progress?.[unlockedKey] as string | null;
              const isUnlocked = !!unlockedAt;
              const isNext = !isUnlocked && !tiers.slice(0, tiers.indexOf(tier)).some(t => !progress?.[`${t.tier}_unlocked_at` as keyof PlayerAchievement]);
              const tierColor = TIER_COLORS[tier.tier];
              const progressPct = isNext ? Math.min(100, Math.round((currentProgress / tier.target) * 100)) : 0;

              return (
                <View key={tier.tier} style={[styles.tierRow, { borderLeftColor: isUnlocked ? tierColor : colors.border, borderLeftWidth: 3 }]}>
                  <View style={styles.tierHeader}>
                    <View style={[styles.tierDot, { backgroundColor: isUnlocked ? tierColor : colors.border }]} />
                    <Text style={[styles.tierLabel, { color: isUnlocked ? tierColor : colors.textMid, fontWeight: isUnlocked ? '700' : '500' }]}>
                      {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                    </Text>
                    {isUnlocked && <Text style={[styles.checkMark, { color: tierColor }]}>{'\u2713'}</Text>}
                  </View>
                  <Text style={[styles.tierDesc, { color: isUnlocked ? colors.text : colors.textMid }]}>{tier.description}</Text>

                  {isUnlocked && unlockedAt && (
                    <Text style={[styles.tierMeta, { color: colors.textLight }]}>
                      Unlocked {new Date(unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · <Text style={{ color: '#00B894', fontWeight: '700' }}>+{tier.gems} gems</Text>
                    </Text>
                  )}

                  {isNext && (
                    <View style={styles.progressRow}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tierColor }]} />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textLight }]}>{currentProgress}/{tier.target}</Text>
                    </View>
                  )}

                  {!isUnlocked && !isNext && (
                    <Text style={[styles.tierMeta, { color: colors.textLight }]}>{tier.target} needed · +{tier.gems} gems</Text>
                  )}
                </View>
              );
            })}
          </View>

          <Pressable style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.textMid }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  iconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  desc: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  tierList: { width: '100%', gap: 14, marginBottom: 20 },
  tierRow: { paddingLeft: 12, paddingVertical: 4 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontSize: 13 },
  checkMark: { fontSize: 14, fontWeight: '800' },
  tierDesc: { fontSize: 12, marginBottom: 2 },
  tierMeta: { fontSize: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '600', width: 40 },
  closeBtn: { borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  closeBtnText: { fontSize: 16, fontWeight: '600' },
});
