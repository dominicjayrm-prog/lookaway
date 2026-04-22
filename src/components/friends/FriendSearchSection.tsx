import React, { forwardRef, useEffect, useRef } from 'react';
import { t } from '@/src/i18n';
import { View, Text, Pressable, TextInput, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import type { FriendProfile } from '@/src/utils/friends';

/**
 * Animated Add → Sent button used inside a single search result row.
 * When `sent` flips true the pill morphs into a green checkmark with a
 * spring scale. Both states share the same wrapper Animated.View so
 * the scale transition plays instead of the component unmounting.
 *
 * Kept here (not exported from the file) because the pill is only used
 * by this section — nothing else in the app renders a "request sent"
 * state inline with the sender's button.
 */
function AnimatedAddButton({
  sent,
  onPress,
}: {
  sent: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const morph = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (sent) {
      RNAnimated.spring(morph, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
    } else {
      morph.setValue(0);
    }
  }, [sent, morph]);

  const scaleStyle = {
    transform: [
      { scale: morph.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.15, 1] }) },
    ],
  };

  return (
    <RNAnimated.View style={scaleStyle}>
      {sent ? (
        <RNAnimated.View
          style={[
            styles.sentPill,
            {
              backgroundColor: colors.correctSoft,
              borderColor: colors.correct + '55',
            },
          ]}
        >
          <Ionicons name="checkmark" size={14} color={colors.correct} />
          <Text style={[styles.sentPillText, { color: colors.correct }]}>{t('friends.sent')}</Text>
        </RNAnimated.View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.addBtnSmall,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('friends.send_request_aria')}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{t('friends.add')}</Text>
        </Pressable>
      )}
    </RNAnimated.View>
  );
}

interface FriendSearchSectionProps {
  searchText: string;
  onChangeSearchText: (text: string) => void;
  searchFocused: boolean;
  onFocusChange: (focused: boolean) => void;
  searchResults: FriendProfile[];
  sentRequests: Set<string>;
  onSendRequest: (addresseeId: string, username: string) => void;
}

/**
 * Search input + results dropdown. The parent owns the debounce +
 * Supabase query so this stays purely presentational — it just renders
 * whatever `searchResults` contains and forwards taps back out.
 *
 * The parent uses the forwarded ref to `.focus()` the TextInput when
 * the user taps "Add by username" in the quick-actions card at the
 * bottom of the screen.
 */
export const FriendSearchSection = forwardRef<TextInput, FriendSearchSectionProps>(
  function FriendSearchSection(
    {
      searchText,
      onChangeSearchText,
      searchFocused,
      onFocusChange,
      searchResults,
      sentRequests,
      onSendRequest,
    },
    ref,
  ) {
    const { colors } = useTheme();
    return (
      <>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: searchFocused ? colors.accent : colors.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? colors.accent : colors.textLight}
            style={styles.searchIcon}
          />
          <TextInput
            ref={ref}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('friends.search_placeholder')}
            placeholderTextColor={colors.textLight}
            value={searchText}
            onChangeText={onChangeSearchText}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('friends.search_aria')}
          />
          {searchText.length > 0 && (
            <Pressable
              onPress={() => onChangeSearchText('')}
              accessibilityRole="button"
              accessibilityLabel={t('friends.clear_search_aria')}
            >
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </Pressable>
          )}
        </View>

        {searchText.trim().length > 0 && searchResults.length === 0 && (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.card, padding: 16, alignItems: 'center' }]}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>
              No players found matching "{searchText}"
            </Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.card }]}>
            {searchResults.map((u) => (
              <View key={u.id} style={[styles.searchResultRow, { borderBottomColor: colors.border }]}>
                <FriendAvatar
                  username={u.username}
                  avatarColor={u.avatar_color}
                  avatarUrl={u.avatar_url}
                  equippedFrame={u.equipped_frame}
                  equippedExpression={u.equipped_expression}
                  size={32}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.searchResultName, { color: colors.text }]}>@{u.username}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight }}>
                    World {u.highest_world} · {'\u2B50'} {u.total_stars}
                  </Text>
                </View>
                <AnimatedAddButton
                  sent={sentRequests.has(u.id)}
                  onPress={() => onSendRequest(u.id, u.username)}
                />
              </View>
            ))}
          </View>
        )}
      </>
    );
  },
);

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  searchResultsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  searchResultName: { fontSize: 14, fontWeight: '600' },
  addBtnSmall: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  sentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sentPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
