/**
 * FriendProfilePopup — detailed friend card shown when the user taps a
 * friend in their list. Showcases the friend's full customisation:
 *
 *  - Equipped banner as the top gradient strip
 *  - Equipped frame + Blink with equipped expression centred on the banner
 *  - Username painted in their equipped name color
 *  - Stat grid: World, Stars, Memory, Achievements (X/Y)
 *  - Head-to-head record vs the current user
 *  - Challenge + Close + Remove friend actions
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blink, type BlinkExpression } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { ProfileBanner } from '@/src/components/ProfileBanner';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { getOnlineStatus, getLastActiveText, STATUS_COLORS } from '@/src/utils/onlineStatus';
import {
  getFrameById,
  getBannerById,
  getNameColorById,
  getExpressionById,
} from '@/src/data/cosmetics';
import { useAuth } from '@/src/providers/AuthProvider';
import { loadPlayerProgress, countUnlockedTiers, loadAllAchievements } from '@/src/utils/achievements';
import { getHeadToHeadRecord } from '@/src/utils/friends';
import { ReportUserModal } from '@/src/components/ReportUserModal';

interface FriendProfileInput {
  id: string;
  username: string;
  avatar_color: string;
  total_stars: number;
  highest_world: number;
  last_seen: string | null;
  avatar_url?: string | null;
  equipped_frame?: string | null;
  equipped_expression?: string | null;
  equipped_banner?: string | null;
  equipped_name_color?: string | null;
  memory_score_avg?: number | null;
}

interface FriendProfilePopupProps {
  visible: boolean;
  friend: {
    friendshipId: string;
    profile: FriendProfileInput;
  };
  colors: Record<string, string>;
  onClose: () => void;
  onChallenge: (friendId: string) => void;
  onRemove: (friendshipId: string) => void;
}

function FriendProfilePopupInner({ visible, friend, colors, onClose, onChallenge, onRemove }: FriendProfilePopupProps) {
  const { profile } = friend;
  const { user } = useAuth();
  const myId = user?.id;
  const status = getOnlineStatus(profile.last_seen);
  const statusColor = STATUS_COLORS[status];
  const statusText = getLastActiveText(profile.last_seen);
  // Report modal is owned by the popup itself rather than the parent
  // so we don't have to prop-drill yet another callback.
  const [showReport, setShowReport] = React.useState(false);

  // Resolve cosmetics
  const frame = profile.equipped_frame ? getFrameById(profile.equipped_frame) ?? null : null;
  const banner = profile.equipped_banner ? getBannerById(profile.equipped_banner) ?? null : null;
  const nameColor = profile.equipped_name_color ? getNameColorById(profile.equipped_name_color) : undefined;
  const expressionCosmetic = profile.equipped_expression ? getExpressionById(profile.equipped_expression) : undefined;
  const blinkExpression: BlinkExpression = expressionCosmetic?.blinkExpression ?? 'normal';
  const nameStyleColor = nameColor && nameColor.color !== 'theme' ? nameColor.color : colors.text;

  // Achievements + head-to-head fetched lazily when the popup opens.
  const [achievements, setAchievements] = useState<{ unlocked: number; total: number } | null>(null);
  const [record, setRecord] = useState<{ wins: number; losses: number; draws: number } | null>(null);

  useEffect(() => {
    if (!visible) {
      setAchievements(null);
      setRecord(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [progress, all] = await Promise.all([
          loadPlayerProgress(profile.id),
          loadAllAchievements(),
        ]);
        if (cancelled) return;
        const unlocked = countUnlockedTiers(progress);
        // Each achievement has up to 3 tiers (bronze/silver/gold) in this codebase.
        const total = all.length * 3;
        setAchievements({ unlocked, total });
      } catch {
        if (!cancelled) setAchievements({ unlocked: 0, total: 0 });
      }
    })();
    if (myId) {
      getHeadToHeadRecord(myId, profile.id)
        .then((r) => { if (!cancelled) setRecord(r); })
        .catch(() => { if (!cancelled) setRecord({ wins: 0, losses: 0, draws: 0 }); });
    }
    return () => { cancelled = true; };
  }, [visible, profile.id, myId]);

  // Memory score: use the stored server average if present; otherwise fall
  // back to a dash so we don't lie.
  const memoryScore = typeof profile.memory_score_avg === 'number' ? Math.round(profile.memory_score_avg) : null;
  // Null = still loading; show ellipsis so it's clear data is on the way
  // rather than a dash that could be mistaken for "no record".
  const recordText = record ? `${record.wins}-${record.losses}${record.draws > 0 ? `-${record.draws}` : ''}` : '…';
  const achievementsText = achievements ? `${achievements.unlocked}/${achievements.total}` : '…';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Banner header with the avatar overlapping the bottom edge */}
          <View style={styles.bannerWrap}>
            <ProfileBanner banner={banner} height={108} />
            <View style={styles.avatarAnchor}>
              <AvatarFrame frame={frame} size={78}>
                <View style={[styles.avatarInner, { backgroundColor: colors.card }]}>
                  <Blink expression={blinkExpression} size={72} />
                </View>
              </AvatarFrame>
            </View>
          </View>

          {/* Close button — anchored to the card, not the banner, so it
              has a visible backing plate even when the player is wearing
              the default (transparent) banner. Tints to white-on-dark on
              a real banner, dark-on-surface on an empty one. */}
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.closeBtn,
              banner && banner.id !== 'banner_none'
                ? { backgroundColor: 'rgba(0,0,0,0.3)' }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="close"
              size={16}
              color={banner && banner.id !== 'banner_none' ? '#FFFFFF' : colors.textMid}
            />
          </Pressable>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.username, { color: nameStyleColor }]}>@{profile.username}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: status === 'online' ? colors.correct : colors.textMid }]}>
                {statusText}
              </Text>
            </View>

            {/* Primary stat grid — 2 rows of 3 */}
            <View style={styles.statGrid}>
              <StatCell label="Stars" value={String(profile.total_stars)} icon="star" iconColor={colors.gold} colors={colors} />
              <StatCell label="World" value={String(profile.highest_world)} icon="map-outline" iconColor={colors.accent} colors={colors} />
              <StatCell label="Memory" value={memoryScore !== null ? `${memoryScore}%` : ' -'} icon="pulse" iconColor={colors.blue} colors={colors} />
            </View>
            <View style={styles.statGrid}>
              <StatCell label="Record" value={recordText} icon="trophy-outline" iconColor={colors.wrong} colors={colors} />
              <StatCell label="Achievements" value={achievementsText} icon="medal" iconColor={colors.gold} colors={colors} />
              <StatCell label="Status" value={status === 'online' ? 'Online' : 'Offline'} icon={status === 'online' ? 'ellipse' : 'ellipse-outline'} iconColor={statusColor} colors={colors} />
            </View>

            {/* Equipped cosmetics showcase */}
            {(frame || banner || expressionCosmetic) && (
              <View style={[styles.cosmeticStrip, { borderColor: colors.border }]}>
                <Text style={[styles.cosmeticLabel, { color: colors.textMid }]}>EQUIPPED</Text>
                <View style={styles.cosmeticRow}>
                  {frame && frame.id !== 'frame_none' && (
                    <CosmeticChip label={frame.name} colors={colors} />
                  )}
                  {expressionCosmetic && expressionCosmetic.id !== 'expr_normal' && (
                    <CosmeticChip label={expressionCosmetic.name} colors={colors} />
                  )}
                  {banner && banner.id !== 'banner_none' && (
                    <CosmeticChip label={banner.name} colors={colors} />
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={[styles.challengeButton, { backgroundColor: colors.accent }]} onPress={() => onChallenge(profile.id)}>
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.challengeText}>Challenge @{profile.username}</Text>
            </Pressable>
            {/* Secondary row: Remove | Report, equal width, muted.
                Report uses a distinct subdued flag icon + wrong colour
                to match the modal accent so the action is clearly
                destructive without being aggressive. */}
            <View style={styles.secondaryRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => onRemove(friend.friendshipId)}>
                <Ionicons name="person-remove-outline" size={14} color={colors.textMid} />
                <Text style={[styles.secondaryText, { color: colors.textMid }]}>Remove</Text>
              </Pressable>
              <View style={[styles.secondaryDivider, { backgroundColor: colors.border }]} />
              <Pressable style={styles.secondaryBtn} onPress={() => setShowReport(true)} accessibilityRole="button" accessibilityLabel={`Report @${profile.username}`}>
                <Ionicons name="flag-outline" size={14} color={colors.wrong} />
                <Text style={[styles.secondaryText, { color: colors.wrong }]}>Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      {/* Report modal mounted inside the popup so it overlays cleanly
          when stacked on top of the profile card. */}
      <ReportUserModal
        visible={showReport}
        reporterId={myId}
        reportedId={profile.id}
        reportedUsername={profile.username}
        onClose={() => setShowReport(false)}
      />
    </Modal>
  );
}

function StatCell({
  label,
  value,
  icon,
  iconColor,
  colors,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  colors: Record<string, string>;
}) {
  return (
    <View style={[styles.statCell, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={14} color={iconColor} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMid }]}>{label}</Text>
    </View>
  );
}

function CosmeticChip({ label, colors }: { label: string; colors: Record<string, string> }) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.chipText, { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { borderRadius: 24, width: '100%', maxWidth: 340, overflow: 'hidden' },

  bannerWrap: { position: 'relative' },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -44,
    alignItems: 'center',
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },

  username: { fontSize: 20, fontWeight: typography.weights.bold, marginTop: 56, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: spacing.lg },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: typography.weights.medium },

  statGrid: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 8 },
  statCell: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { fontSize: 16, fontWeight: typography.weights.bold },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

  cosmeticStrip: {
    width: '100%',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cosmeticLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  cosmeticRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 10, fontWeight: '700' },

  actions: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 12, gap: 6 },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 13,
    width: '100%',
  },
  challengeText: { fontSize: 15, fontWeight: typography.weights.bold, color: '#FFFFFF' },
  removeButton: { paddingVertical: spacing.xs, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 12, fontWeight: typography.weights.medium },
  // Remove + Report sit as twin secondary actions separated by a
  // thin divider. Keeps both discoverable without adding a second
  // full-width button that would compete with the primary Challenge
  // CTA.
  secondaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: spacing.xs, minHeight: 32 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 6 },
  secondaryText: { fontSize: 12, fontWeight: typography.weights.medium },
  secondaryDivider: { width: 1, height: 14 },
});

export const FriendProfilePopup = React.memo(FriendProfilePopupInner);
