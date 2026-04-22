import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { Blink } from '@/src/components/Blink';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { StatusDot } from '@/src/components/StatusDot';
import { getLastActiveText } from '@/src/utils/onlineStatus';
import { SectionLabel } from './SectionLabel';
import type { Friend } from '@/src/utils/friends';

interface FriendsListSectionProps {
  friends: Friend[];
  onSelectFriend: (friend: Friend) => void;
}

/**
 * "YOUR FRIENDS (N)" list — always renders the section label so the
 * empty state is visible (unlike FriendRequestsSection which hides
 * itself when empty). When the list is empty we show a sad-Blink
 * empty card prompting the user to search or share their invite.
 */
export function FriendsListSection({ friends, onSelectFriend }: FriendsListSectionProps) {
  const { colors } = useTheme();
  return (
    <>
      <SectionLabel label={t('friends.your_friends', { count: friends.length })} />
      {friends.length === 0 ? (
        <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
          <Blink expression="sad" size={48} />
          <Text style={[styles.emptyText, { color: colors.textLight, marginTop: 12 }]}>
            No friends yet. Search for a username or share your invite link to get started.
          </Text>
        </View>
      ) : (
        friends.map((f) => (
          <Pressable
            key={f.friendshipId}
            style={[styles.friendCard, { backgroundColor: colors.card }]}
            onPress={() => onSelectFriend(f)}
            accessibilityRole="button"
            accessibilityLabel={`Open profile for ${f.profile.username}`}
          >
            <View style={{ position: 'relative' }}>
              <FriendAvatar
                username={f.profile.username}
                avatarColor={f.profile.avatar_color}
                avatarUrl={f.profile.avatar_url}
                equippedFrame={f.profile.equipped_frame}
                equippedExpression={f.profile.equipped_expression}
                size={40}
              />
              <StatusDot lastActiveAt={f.profile.last_seen} borderColor={colors.card} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.friendName, { color: colors.text }]}>@{f.profile.username}</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>
                {getLastActiveText(f.profile.last_seen)} · World {f.profile.highest_world} · {'\u2B50'}{' '}
                {f.profile.total_stars}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  emptySection: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  friendName: { fontSize: 14, fontWeight: '600' },
});
