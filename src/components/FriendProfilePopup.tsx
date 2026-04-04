import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';

interface FriendProfilePopupProps {
  visible: boolean;
  friend: {
    friendshipId: string;
    profile: {
      id: string;
      username: string;
      avatar_color: string;
      total_stars: number;
      highest_world: number;
      last_seen: string | null;
    };
  };
  colors: Record<string, string>;
  onClose: () => void;
  onChallenge: (friendId: string) => void;
  onRemove: (friendshipId: string) => void;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

function FriendProfilePopupInner({ visible, friend, colors, onClose, onChallenge, onRemove }: FriendProfilePopupProps) {
  const { profile } = friend;
  const online = isOnline(profile.last_seen);
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          {/* Username */}
          <Text style={[styles.username, { color: colors.text }]}>@{profile.username}</Text>

          {/* Online status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: online ? colors.correct : colors.textLight }]} />
            <Text style={[styles.statusText, { color: online ? colors.correct : colors.textMid }]}>
              {online ? 'Online now' : 'Offline'}
            </Text>
          </View>

          {/* Stat cards */}
          <View style={styles.statsRow}>
            {[
              { label: 'World', value: String(profile.highest_world) },
              { label: 'Stars', value: String(profile.total_stars), icon: 'star' as const },
              { label: 'Record', value: '0-0' },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <View style={styles.statValueRow}>
                  {stat.icon && <Ionicons name={stat.icon} size={14} color={colors.gold} style={{ marginRight: 3 }} />}
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMid }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Challenge button */}
          <Pressable style={[styles.challengeButton, { backgroundColor: colors.accent }]} onPress={() => onChallenge(profile.id)}>
            <Text style={styles.challengeText}>Challenge @{profile.username}</Text>
          </Pressable>

          {/* Close button */}
          <Pressable style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.textMid }]}>Close</Text>
          </Pressable>

          {/* Remove friend */}
          <Pressable style={styles.removeButton} onPress={() => onRemove(friend.friendshipId)}>
            <Text style={[styles.removeText, { color: colors.wrong }]}>Remove friend</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: { borderRadius: 24, padding: 28, width: '100%', maxWidth: 320, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: typography.weights.bold, color: '#FFFFFF' },
  username: { fontSize: 18, fontWeight: typography.weights.bold, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  statusText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, width: '100%' },
  statCard: { flex: 1, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  statLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, marginTop: 2 },
  challengeButton: { borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: spacing.sm },
  challengeText: { fontSize: 16, fontWeight: typography.weights.bold, color: '#FFFFFF' },
  closeButton: { borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: spacing.lg },
  closeText: { fontSize: 16, fontWeight: typography.weights.semibold },
  removeButton: { paddingVertical: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 12, fontWeight: typography.weights.medium },
});

export const FriendProfilePopup = React.memo(FriendProfilePopupInner);
