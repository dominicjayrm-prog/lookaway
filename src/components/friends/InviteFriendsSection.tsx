import React from 'react';
import { t } from '@/src/i18n';
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
      <SectionLabel label={t('friends.invite_friends')} />
      <ReferralCard />

      <View style={[styles.inviteCard, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onAddByUsername}
          accessibilityRole="button"
          accessibilityLabel={t('friends.add_by_username_aria')}
        >
          <Ionicons name="search-outline" size={20} color={colors.accent} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>{t('friends.add_by_username')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onScanQR}
          accessibilityRole="button"
          accessibilityLabel={t('friends.scan_qr_aria')}
        >
          <Ionicons name="scan-outline" size={20} color={colors.accent} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>{t('friends.scan_qr')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={[styles.inviteRow, { borderBottomColor: colors.border }]}
          onPress={onShowMyQR}
          accessibilityRole="button"
          accessibilityLabel={t('friends.show_qr_aria')}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.blue} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>{t('friends.show_qr')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={styles.inviteRow}
          onPress={onShareInvite}
          accessibilityRole="button"
          accessibilityLabel={t('friends.share_link_aria')}
        >
          <Ionicons name="share-outline" size={20} color={colors.correct} />
          <Text style={[styles.inviteRowText, { color: colors.text }]}>{t('friends.share_link')}</Text>
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
