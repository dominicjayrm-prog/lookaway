import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { spacing, borderRadius } from '@/src/theme/spacing';

function SectionLabel({ label, colors }: { label: string; colors: Record<string, string> }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{label}</Text>
  );
}

export default function FriendsTab() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setUsername(data.display_name);
      });
  }, [user?.id]);

  return (
    <TabTransition>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
              <Text style={[styles.subtitle, { color: colors.textMid }]}>
                @{username || 'player'}
              </Text>
            </View>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.accentSoft }]}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.accent} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.card,
                borderColor: searchFocused ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? colors.accent : colors.textLight}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Add friend by username..."
              placeholderTextColor={colors.textLight}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Friend Requests */}
          <SectionLabel label="FRIEND REQUESTS" colors={colors} />
          <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No pending requests
            </Text>
          </View>

          {/* Active Challenges */}
          <SectionLabel label="ACTIVE CHALLENGES" colors={colors} />
          <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No active challenges
            </Text>
          </View>

          {/* Your Friends */}
          <SectionLabel label="YOUR FRIENDS (0)" colors={colors} />
          <View style={[styles.emptySection, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No friends yet. Search for a username or share your invite link to get started.
            </Text>
          </View>

          {/* Invite Friends card */}
          <SectionLabel label="INVITE FRIENDS" colors={colors} />
          <View style={[styles.inviteCard, { backgroundColor: colors.card }]}>
            <Pressable style={[styles.inviteRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.accent} />
              <Text style={[styles.inviteRowText, { color: colors.text }]}>
                Add by username
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </Pressable>
            <Pressable style={styles.inviteRow}>
              <Ionicons name="share-outline" size={20} color={colors.accent} />
              <Text style={[styles.inviteRowText, { color: colors.text }]}>
                Share invite link
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.xl,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  emptySection: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  inviteCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
  inviteRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.md,
  },
});
