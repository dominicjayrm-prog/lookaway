import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { borderRadius } from '@/src/theme/spacing';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { StatusDot } from '@/src/components/StatusDot';
import { SectionLabel } from './SectionLabel';
import type { Challenge } from '@/src/utils/friends';

interface ActiveChallengesSectionProps {
  challenges: Challenge[];
  onPlayClassic: (challengeId: string) => void;
  onPlayMode: (challengeId: string, mode: string) => void;
  onDeclineIncoming: (challengeId: string, opponentUsername: string) => void;
  onCancelOutgoing: (challengeId: string, opponentUsername: string) => void;
}

/**
 * "Active challenges" list. Renders each in-flight friend challenge
 * with the correct CTA depending on state:
 *
 * - `my_score === null` → I owe a turn → show Play + Decline
 * - `their_score === null` → opponent owes a turn → show Pending + Cancel
 * - both scored → show Done badge (still lives here until the row is
 *   moved into LAST 3 RESULTS on next loadData tick)
 *
 * Returns null when empty so callers can mount unconditionally.
 */
export function ActiveChallengesSection({
  challenges,
  onPlayClassic,
  onPlayMode,
  onDeclineIncoming,
  onCancelOutgoing,
}: ActiveChallengesSectionProps) {
  const { colors } = useTheme();
  if (challenges.length === 0) return null;

  return (
    <>
      <SectionLabel label={t('friends.active_challenges')} />
      {challenges.map((c) => {
        const iNeedToPlay = c.my_score === null;
        const waitingForOpponent = c.my_score !== null && c.their_score === null;
        const cMode = c.mode ?? 'classic';
        const modeLabel = cMode !== 'classic' ? ` to ${cMode.replace(/_/g, ' ')}` : '';
        const label = iNeedToPlay
          ? `@${c.opponent.username} challenged you${modeLabel}`
          : waitingForOpponent
            ? `Waiting for @${c.opponent.username}`
            : `You vs @${c.opponent.username}`;

        return (
          <View key={c.id} style={[styles.challengeCard, { backgroundColor: colors.card }]}>
            <View style={{ position: 'relative' }}>
              <FriendAvatar
                username={c.opponent.username}
                avatarColor={c.opponent.avatar_color}
                avatarUrl={c.opponent.avatar_url}
                equippedFrame={c.opponent.equipped_frame}
                equippedExpression={c.opponent.equipped_expression}
                size={34}
              />
              <StatusDot lastActiveAt={c.opponent.last_seen} size={8} borderColor={colors.card} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.challengeText, { color: colors.text }]}>{label}</Text>
              <Text style={{ fontSize: 11, color: colors.textMid }}>{c.level_ids.length} levels</Text>
            </View>

            {iNeedToPlay ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  style={[styles.declineChallengeBtn, { backgroundColor: colors.surface }]}
                  onPress={() => onDeclineIncoming(c.id, c.opponent.username)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Decline challenge from ${c.opponent.username}`}
                >
                  <Ionicons name="close" size={16} color={colors.textMid} />
                </Pressable>
                <Pressable
                  style={[styles.playBtn, { backgroundColor: colors.wrong }]}
                  onPress={() => {
                    if (cMode === 'classic') onPlayClassic(c.id);
                    else onPlayMode(c.id, cMode);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Play challenge from ${c.opponent.username}`}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{t('friends.play')}</Text>
                </Pressable>
              </View>
            ) : waitingForOpponent ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <View style={[styles.pendingBadge, { backgroundColor: colors.goldSoft }]}>
                  <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>{t('friends.pending')}</Text>
                </View>
                <Pressable
                  onPress={() => onCancelOutgoing(c.id, c.opponent.username)}
                  hitSlop={6}
                  style={{ padding: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel challenge sent to ${c.opponent.username}`}
                >
                  <Ionicons name="close" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            ) : (
              <View style={[styles.pendingBadge, { backgroundColor: colors.correctSoft }]}>
                <Text style={{ color: colors.correct, fontSize: 11, fontWeight: '700' }}>{t('friends.done')}</Text>
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  challengeCard: {
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
  },
  challengeText: { fontSize: 13, fontWeight: '600' },
  playBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  declineChallengeBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
});
