/**
 * Blocked users screen — lists everyone the current player has
 * blocked, with an Unblock action per row. Required by Apple 1.2
 * UGC guideline: users must be able to MANAGE their blocklist,
 * not just add to it.
 *
 * Empty state shows a friendly Blink mascot + generic message so
 * first-time visitors know this is a real feature, not a broken
 * screen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { listBlockedUsers, unblockUser, type BlockedUser } from '@/src/utils/blockUser';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';

const isWeb = Platform.OS === 'web';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) { setBlocked([]); return; }
    const rows = await listBlockedUsers(user.id);
    setBlocked(rows);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleUnblock = useCallback((row: BlockedUser) => {
    if (!user?.id) return;
    const run = async () => {
      setUnblocking(row.id);
      const ok = await unblockUser(user.id, row.id);
      setUnblocking(null);
      if (ok) {
        setBlocked((prev) => (prev ?? []).filter((b) => b.id !== row.id));
      } else {
        const msg = `Could not unblock @${row.username}. Please try again.`;
        if (isWeb && typeof window !== 'undefined') (window as any).alert?.(msg);
        else Alert.alert('Unblock failed', msg);
      }
    };
    const confirmMsg = `Unblock @${row.username}? They'll be able to send you friend requests and challenges again.`;
    if (isWeb && typeof window !== 'undefined') {
      if ((window as any).confirm?.(confirmMsg)) run();
      return;
    }
    Alert.alert('Unblock user', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: run },
    ]);
  }, [user?.id]);

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = unblocking === item.id;
    return (
      <View style={[styles.row, { backgroundColor: colors.card }]}>
        <FriendAvatar
          username={item.username}
          avatarColor={item.avatar_color ?? '#B2BEC3'}
          avatarUrl={item.avatar_url}
          equippedFrame={null}
          equippedExpression={null}
          size={44}
          showDefaultRing={false}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.username, { color: colors.text }]}>@{item.username}</Text>
          <Text style={[styles.since, { color: colors.textLight }]}>Blocked {formatDate(item.created_at)}</Text>
        </View>
        <Pressable
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          style={[styles.unblockBtn, { backgroundColor: colors.surface, opacity: isUnblocking ? 0.5 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`Unblock ${item.username}`}
        >
          <Text style={[styles.unblockText, { color: colors.text }]}>
            {isUnblocking ? 'Unblocking…' : 'Unblock'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('blocked.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {blocked === null ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : blocked.length === 0 ? (
        <Animated.View entering={isWeb ? undefined : FadeIn.duration(300)} style={styles.emptyWrap}>
          <AnimatedBlink expression="normal" size={80} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('blocked.empty')}</Text>
          <Text style={[styles.emptyBody, { color: colors.textMid }]}>
            When you block someone, they'll show up here. You can block a user from their profile in the Friends tab — they won't be able to send you friend requests or challenges.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { width: 40, height: 40, minWidth: 44, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  headerSpacer: { width: 40 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg },
  username: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  since: { fontSize: typography.sizes.xs, marginTop: 2 },
  unblockBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.md },
  unblockText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, marginTop: spacing.md },
  emptyBody: { fontSize: typography.sizes.md, textAlign: 'center', lineHeight: 22 },
});
