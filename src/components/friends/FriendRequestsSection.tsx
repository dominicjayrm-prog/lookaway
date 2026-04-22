import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { borderRadius } from '@/src/theme/spacing';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { SectionLabel } from './SectionLabel';
import type { FriendRequest } from '@/src/utils/friends';

interface FriendRequestsSectionProps {
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

/**
 * Incoming friend requests list. Renders nothing when empty so the
 * parent can unconditionally mount it — no `length > 0` check needed
 * at the call site.
 */
export function FriendRequestsSection({ requests, onAccept, onDecline }: FriendRequestsSectionProps) {
  const { colors } = useTheme();
  if (requests.length === 0) return null;

  return (
    <>
      <SectionLabel label={t('friends.friend_requests')} />
      {requests.map((r) => (
        <View key={r.id} style={[styles.requestCard, { backgroundColor: colors.card }]}>
          <FriendAvatar
            username={r.requester.username}
            avatarColor={r.requester.avatar_color}
            avatarUrl={r.requester.avatar_url}
            equippedFrame={r.requester.equipped_frame}
            equippedExpression={r.requester.equipped_expression}
            size={38}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.requestName, { color: colors.text }]}>@{r.requester.username}</Text>
            <Text style={{ fontSize: 12, color: colors.textMid }}>{t('friends.wants_to_be_friends')}</Text>
          </View>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: colors.accent }]}
            onPress={() => onAccept(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`Accept friend request from ${r.requester.username}`}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{t('friends.accept')}</Text>
          </Pressable>
          <Pressable
            style={styles.declineBtn}
            onPress={() => onDecline(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`Decline friend request from ${r.requester.username}`}
          >
            <Ionicons name="close" size={18} color={colors.textLight} />
          </Pressable>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#00B894',
  },
  requestName: { fontSize: 14, fontWeight: '600' },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  declineBtn: { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
