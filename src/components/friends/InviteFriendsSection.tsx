import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/theme/spacing';
import ReferralCard from '@/src/components/ReferralCard';
import { SectionLabel } from './SectionLabel';

interface InviteFriendsSectionProps {
  onAddByUsername: () => void;
  onScanQR: () => void;
  onShowMyQR: () => void;
  onShareInvite: () => void;
}

/**
 * Invite card + quick-actions stack that lives at the bottom of the
 * friends tab. All four rows forward to callbacks; the parent owns
 * the modal state and share-sheet logic.
 */
export function InviteFriendsSection({
  onAddByUsername,
  onScanQR,
  onShowMyQR,
  onShareInvite,
}: InviteFriendsSectionProps) {
  const { colors } = useTheme();
  return (
    <>
      <SectionLabel label="INVITE FRIENDS" />
      <ReferralCard />

      <View style={[styles.inviteCard, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onAddByUsername}
          accessibilityRole="button"
          accessibilityLabel="Add friend by username"
        >
          <Ionicons name="search-outline" size={20} color={colors.accent} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>Add by username</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onScanQR}
          accessibilityRole="button"
          accessibilityLabel="Scan friend QR code"
        >
          <Ionicons name="scan-outline" size={20} color={colors.accent} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>Scan QR code</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onShowMyQR}
          accessibilityRole="button"
          accessibilityLabel="Show my QR code"
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.blue} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>Show my QR code</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={styles.inviteRow}
          onPress={onShareInvite}
          accessibilityRole="button"
          accessibilityLabel="Share invite link"
        >
          <Ionicons name="share-outline" size={20} color={colors.correct} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>Share invite link</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inviteCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  inviteRowText: { flex: 1, fontSize: 14, fontWeight: '500', marginLeft: spacing.md },
});
