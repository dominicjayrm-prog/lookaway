import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share, Alert, Image, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useGameStore } from '@/src/store';
import { searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, getFriendRequests, getFriends, getActiveChallenges, getRecentResults, updateOnlineStatus, addFriendById } from '@/src/utils/friends';
import type { FriendProfile, FriendRequest, Friend, Challenge } from '@/src/utils/friends';
import { FriendProfilePopup } from '@/src/components/FriendProfilePopup';
import { StatusDot } from '@/src/components/StatusDot';
import { getOnlineStatus, getLastActiveText } from '@/src/utils/onlineStatus';
import { spacing, borderRadius } from '@/src/theme/spacing';
import LeaderboardSection from '@/src/components/LeaderboardSection';
import ReferralCard from '@/src/components/ReferralCard';
import { Blink } from '@/src/components/Blink';
import { FriendQRSheet } from '@/src/components/FriendQRSheet';
import { FriendQRScanner } from '@/src/components/FriendQRScanner';
import { FriendRequestToast, type ToastTone } from '@/src/components/FriendRequestToast';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { readFriendsCache, writeFriendsCache } from '@/src/utils/friendsCache';
import * as Haptics from 'expo-haptics';

function Avatar({ username, color, size = 36, avatarUrl }: { username: string; color: string; size?: number; avatarUrl?: string | null }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + '15', borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) * 0.3 }} />
      ) : (
        <Blink expression="normal" size={size - 4} />
      )}
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: Record<string, string> }) {
  return <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{label}</Text>;
}

/**
 * Animated Add → Sent button for search results. When `sent` flips true
 * the pill morphs into a green checkmark with a spring scale. Both
 * states share the same wrapper Animated.View so the scale transition
 * plays instead of the component unmounting and remounting.
 */
function AnimatedAddButton({ sent, onPress, colors }: { sent: boolean; onPress: () => void; colors: Record<string, string> }) {
  // Drives the sent-state scale pop. 0 = add state, 1 = sent state.
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
          <Text style={[styles.sentPillText, { color: colors.correct }]}>Sent</Text>
        </RNAnimated.View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.addBtnSmall,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onPress}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Add</Text>
        </Pressable>
      )}
    </RNAnimated.View>
  );
}

function FriendsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  // Read the last-known friends blob from localStorage SYNCHRONOUSLY on
  // first render so the tab doesn't flash the empty state while the
  // real Supabase query is in flight. `loadData()` refreshes in the
  // background — users see stable layout across tab switches.
  const initialCache = useRef(readFriendsCache(userId)).current;
  const storeUsername = useGameStore(s => s.username);
  const [username, setUsername] = useState<string | null>(storeUsername ?? null);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>(initialCache.requests);
  const [friends, setFriends] = useState<Friend[]>(initialCache.friends);
  const [challenges, setChallenges] = useState<Challenge[]>(initialCache.challenges);
  const [results, setResults] = useState<Challenge[]>(initialCache.results);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [toast, setToast] = useState<{ title: string; subtitle?: string; tone: ToastTone } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Keep the header username in sync with the store's authoritative
  // value — hydrates instantly, then updates after cloud sync.
  useEffect(() => { if (storeUsername) setUsername(storeUsername); }, [storeUsername]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [req, fr, ch, res] = await Promise.all([getFriendRequests(userId), getFriends(userId), getActiveChallenges(userId), getRecentResults(userId, 3)]);
    setRequests(req); setFriends(fr); setChallenges(ch); setResults(res); updateOnlineStatus(userId);
    // Persist the fresh blob so the next mount can hydrate without a flash.
    writeFriendsCache(userId, { friends: fr, requests: req, challenges: ch, results: res });
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchText.trim() || !userId) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => { const res = await searchUsers(searchText.trim(), userId); setSearchResults(res); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchText, userId]);

  const handleSendRequest = useCallback(async (addresseeId: string, username: string) => {
    if (!userId) return;
    // Use the consolidated helper so we catch already-friends / pending
    // cases instead of silently double-inserting.
    const outcome = await addFriendById(userId, addresseeId);
    if (outcome === 'sent') {
      setSentRequests(prev => new Set(prev).add(addresseeId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast({ title: `Request sent to @${username}`, subtitle: 'They will see it in their Friends tab', tone: 'success' });
    } else if (outcome === 'already_friends') {
      setSentRequests(prev => new Set(prev).add(addresseeId));
      setToast({ title: `You and @${username} are already friends`, tone: 'info' });
    } else if (outcome === 'request_pending') {
      setSentRequests(prev => new Set(prev).add(addresseeId));
      setToast({ title: `Request to @${username} is pending`, subtitle: 'Hold tight — they haven\u2019t responded yet', tone: 'info' });
    } else if (outcome === 'self') {
      setToast({ title: 'You can\u2019t add yourself', tone: 'error' });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setToast({ title: 'Couldn\u2019t send request', subtitle: 'Check your connection and try again', tone: 'error' });
    }
  }, [userId]);
  const handleAccept = useCallback(async (id: string) => { await acceptFriendRequest(id, userId); loadData(); }, [loadData, userId]);
  const handleDecline = useCallback(async (id: string) => { await declineFriendRequest(id); loadData(); }, [loadData]);
  const handleShare = useCallback(async () => { try { await Share.share({ message: `Think you've got a good memory? Challenge me on Blanked! playblanked.app/invite/${userId}` }); } catch {} }, [userId]);
  const handleChallenge = useCallback((friendId: string) => { const friend = friends.find(f => f.profile.id === friendId); setSelectedFriend(null); router.push({ pathname: '/game/challenge-select', params: { friendId, friendUsername: friend?.profile.username ?? 'friend' } }); }, [router, friends]);
  const handleRemoveFriend = useCallback(async (friendshipId: string) => { Alert.alert('Remove friend?', 'You can always add them back later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { await removeFriend(friendshipId); setSelectedFriend(null); loadData(); } }]); }, [loadData]);

  useEffect(() => { const refreshInterval = setInterval(() => { if (userId) loadData(); }, 30_000); return () => clearInterval(refreshInterval); }, [userId, loadData]);

  return (
    <TabTransition>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <FriendRequestToast
        visible={!!toast}
        title={toast?.title ?? ''}
        subtitle={toast?.subtitle}
        tone={toast?.tone ?? 'success'}
        onDismiss={() => setToast(null)}
      />
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
            <Text style={[styles.subtitle, { color: colors.textMid }]}>@{username || 'player'}</Text>
          </View>
          <Pressable style={[styles.addButton, { backgroundColor: colors.accentSoft }]} onPress={handleShare}>
            <Ionicons name="person-add-outline" size={20} color={colors.accent} />
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: searchFocused ? colors.accent : colors.border }]}>
          <Ionicons name="search-outline" size={18} color={searchFocused ? colors.accent : colors.textLight} style={styles.searchIcon} />
          <TextInput ref={searchInputRef} style={[styles.searchInput, { color: colors.text }]} placeholder="Add friend by username..." placeholderTextColor={colors.textLight} value={searchText} onChangeText={setSearchText} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
          {searchText.length > 0 && <Pressable onPress={() => setSearchText('')}><Ionicons name="close-circle" size={18} color={colors.textLight} /></Pressable>}
        </View>

        {searchText.trim().length > 0 && searchResults.length === 0 && (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.card, padding: 16, alignItems: 'center' }]}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>No players found matching "{searchText}"</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.card }]}>
            {searchResults.map((u) => (
              <View key={u.id} style={[styles.searchResultRow, { borderBottomColor: colors.border }]}>
                <FriendAvatar username={u.username} avatarColor={u.avatar_color} avatarUrl={u.avatar_url} equippedFrame={u.equipped_frame} equippedExpression={u.equipped_expression} size={32} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.searchResultName, { color: colors.text }]}>@{u.username}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight }}>World {u.highest_world} · {'\u2B50'} {u.total_stars}</Text>
                </View>
                <AnimatedAddButton
                  sent={sentRequests.has(u.id)}
                  onPress={() => handleSendRequest(u.id, u.username)}
                  colors={colors}
                />
              </View>
            ))}
          </View>
        )}

        {requests.length > 0 && (<><SectionLabel label="FRIEND REQUESTS" colors={colors} />{requests.map((r) => (<View key={r.id} style={[styles.requestCard, { backgroundColor: colors.card }]}><FriendAvatar username={r.requester.username} avatarColor={r.requester.avatar_color} avatarUrl={r.requester.avatar_url} equippedFrame={r.requester.equipped_frame} equippedExpression={r.requester.equipped_expression} size={38} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.requestName, { color: colors.text }]}>@{r.requester.username}</Text><Text style={{ fontSize: 12, color: colors.textMid }}>Wants to be friends</Text></View><Pressable style={[styles.acceptBtn, { backgroundColor: colors.accent }]} onPress={() => handleAccept(r.id)}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Accept</Text></Pressable><Pressable style={styles.declineBtn} onPress={() => handleDecline(r.id)}><Ionicons name="close" size={18} color={colors.textLight} /></Pressable></View>))}</>)}

        {challenges.length > 0 && (<><SectionLabel label="ACTIVE CHALLENGES" colors={colors} />{challenges.map((c) => (<View key={c.id} style={[styles.challengeCard, { backgroundColor: colors.card }]}><View style={{ position: 'relative' }}><FriendAvatar username={c.opponent.username} avatarColor={c.opponent.avatar_color} avatarUrl={c.opponent.avatar_url} equippedFrame={c.opponent.equipped_frame} equippedExpression={c.opponent.equipped_expression} size={34} /><StatusDot lastActiveAt={c.opponent.last_seen} size={8} borderColor={colors.card} /></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={[styles.challengeText, { color: colors.text }]}>{c.my_score === null ? `@${c.opponent.username} challenged you${c.mode !== 'classic' ? ` to ${c.mode.replace(/_/g, ' ')}` : ''}` : `You vs @${c.opponent.username}`}</Text><Text style={{ fontSize: 11, color: colors.textMid }}>{c.level_ids.length} levels</Text></View>{c.my_score === null ? (<Pressable style={[styles.playBtn, { backgroundColor: colors.wrong }]} onPress={() => { const cMode = (c as any).mode ?? 'classic'; if (cMode === 'classic') { router.push({ pathname: '/game/challenge', params: { challengeId: c.id, mode: 'play' } }); } else { router.push({ pathname: '/game/challenge-mode', params: { challengeId: c.id, mode: cMode, action: 'play' } }); } }}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Play</Text></Pressable>) : (<View style={[styles.pendingBadge, { backgroundColor: colors.goldSoft }]}><Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>Pending</Text></View>)}</View>))}</>)}

        <SectionLabel label={`YOUR FRIENDS (${friends.length})`} colors={colors} />
        {friends.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: colors.card, alignItems: 'center', paddingVertical: 24 }]}><Blink expression="sad" size={48} /><Text style={[styles.emptyText, { color: colors.textLight, marginTop: 12 }]}>No friends yet. Search for a username or share your invite link to get started.</Text></View>
        ) : (
          friends.map((f) => (
            <Pressable key={f.friendshipId} style={[styles.friendCard, { backgroundColor: colors.card }]} onPress={() => setSelectedFriend(f)}>
              <View style={{ position: 'relative' }}><FriendAvatar username={f.profile.username} avatarColor={f.profile.avatar_color} avatarUrl={f.profile.avatar_url} equippedFrame={f.profile.equipped_frame} equippedExpression={f.profile.equipped_expression} size={40} /><StatusDot lastActiveAt={f.profile.last_seen} borderColor={colors.card} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.friendName, { color: colors.text }]}>@{f.profile.username}</Text><Text style={{ fontSize: 11, color: colors.textLight }}>{getLastActiveText(f.profile.last_seen)} · World {f.profile.highest_world} · {'\u2B50'} {f.profile.total_stars}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          ))
        )}

        {/* Leaderboard */}
        <SectionLabel label="LEADERBOARD" colors={colors} />
        <LeaderboardSection />

        {results.length > 0 && (<><SectionLabel label="LAST 3 RESULTS" colors={colors} />{results.map((r) => { const won = (r.my_score ?? 0) > (r.their_score ?? 0); const tied = r.my_score === r.their_score; return (<Pressable key={r.id} style={[styles.resultCard, { backgroundColor: colors.card }]} onPress={() => router.push({ pathname: '/game/challenge-result', params: { challengeId: r.id } })}><View style={[styles.resultBadge, { backgroundColor: tied ? colors.goldSoft : won ? colors.correctSoft : colors.wrongSoft }]}><Text style={{ fontSize: 11, fontWeight: '800', color: tied ? colors.gold : won ? colors.correct : colors.wrong }}>{tied ? 'T' : won ? 'W' : 'L'}</Text></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text }]}>vs @{r.opponent.username}</Text><Text style={{ fontSize: 11, color: colors.textMid }}>{r.my_score}% — {r.their_score}%</Text></View></Pressable>); })}</>)}

        {/* Referral system */}
        <SectionLabel label="INVITE FRIENDS" colors={colors} />
        <ReferralCard />

        {/* Quick actions */}
        <View style={[styles.inviteCard, { backgroundColor: colors.card, marginTop: 8 }]}>
          <Pressable style={[styles.inviteRow, { borderBottomColor: colors.border }]} onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setTimeout(() => searchInputRef.current?.focus(), 300); }}><Ionicons name="search-outline" size={20} color={colors.accent} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Add by username</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
          <Pressable style={[styles.inviteRow, { borderBottomColor: colors.border }]} onPress={() => setShowQRScanner(true)}><Ionicons name="scan-outline" size={20} color={colors.accent} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Scan QR code</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
          <Pressable style={[styles.inviteRow, { borderBottomColor: colors.border }]} onPress={() => setShowMyQR(true)}><Ionicons name="qr-code-outline" size={20} color={colors.blue} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Show my QR code</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
          <Pressable style={styles.inviteRow} onPress={handleShare}><Ionicons name="share-outline" size={20} color={colors.correct} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Share invite link</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
        </View>
      </ScrollView>

      {selectedFriend && (<FriendProfilePopup visible={true} friend={selectedFriend} colors={colors} onClose={() => setSelectedFriend(null)} onChallenge={handleChallenge} onRemove={handleRemoveFriend} />)}
      <FriendQRSheet visible={showMyQR} onDismiss={() => setShowMyQR(false)} />
      <FriendQRScanner visible={showQRScanner} onDismiss={() => setShowQRScanner(false)} onFriendAdded={loadData} />
    </SafeAreaView>
    </TabTransition>
  );
}

export default FriendsTab;
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: { width: 40, height: 40, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, height: 44, marginBottom: spacing.md },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  searchResultsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
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
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.lg },
  requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#00B894' },
  requestName: { fontSize: 14, fontWeight: '600' },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  declineBtn: { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  challengeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  challengeText: { fontSize: 13, fontWeight: '600' },
  playBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  emptySection: { borderRadius: borderRadius.lg, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center', marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  friendCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  friendName: { fontSize: 14, fontWeight: '600' },
  resultCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  resultBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inviteCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  inviteRowText: { flex: 1, fontSize: 14, fontWeight: '500', marginLeft: spacing.md },
});
