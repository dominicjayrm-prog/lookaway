import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/theme/spacing';

interface FriendsHeaderProps {
  username: string | null;
  onShare: () => void;
}

/**
 * Top-of-tab title block: "Friends" + current @username + a quick
 * share button that triggers the native share sheet with the user's
 * invite link. Keeps friends.tsx free of a chunk of simple layout.
 */
export function FriendsHeader({ username, onShare }: FriendsHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
        <Text style={[styles.subtitle, { color: colors.textMid }]}>@{username || 'player'}</Text>
      </View>
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share invite link"
      >
        <Ionicons name="person-add-outline" size={20} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
