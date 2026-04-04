import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, getFriendRequests, getFriends, getActiveChallenges, getRecentResults, updateOnlineStatus } from '@/src/utils/friends';
import type { FriendProfile, FriendRequest, Friend, Challenge } from '@/src/utils/friends';
import { FriendProfilePopup } from '@/src/components/FriendProfilePopup';
import { StatusDot } from '@/src/components/StatusDot';
import { getOnlineStatus, getLastActiveText } from '@/src/utils/onlineStatus';
import { spacing, borderRadius } from '@/src/theme/spacing';

function Avatar({ username, color, size = 36 }: { username: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontSize: size * 0.4, fontWeight: '800' }}>{(username || '?')[0].toUpperCase()}</Text>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: Record<string, string> }) {
  return <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{label}</Text>;
}

export default function FriendsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [username, setUsername] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [results, setResults] = useState<Challenge[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { if (!userId) return; supabase.from('profiles').select('username').eq('id', userId).single().then(({ data }) => { if (data?.username) setUsername(data.username); }); }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [req, fr, ch, res] = await Promise.all([getFriendRequests(userId), getFriends(userId), getActiveChallenges(userId), getRecentResults(userId, 3)]);
    setRequests(req); setFriends(fr); setChallenges(ch); setResults(res); updateOnlineStatus(userId);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchText.trim() || !userId) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => { const res = await searchUsers(searchText.trim(), userId); setSearchResults(res); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchText, userId]);

  const handleSendRequest = useCallback(async (addresseeId: string) => { if (!userId) return; await sendFriendRequest(userId, addresseeId); setSentRequests(prev => new Set(prev).add(addresseeId)); Alert.alert('Request sent!', 'They will see your request in their Friends tab.'); }, [userId]);
  const handleAccept = useCallback(async (id: string) => { await acceptFriendRequest(id, userId); loadData(); }, [loadData, userId]);
  const handleDecline = useCallback(async (id: string) => { await declineFriendRequest(id); loadData(); }, [loadData]);
  const handleShare = useCallback(async () => { try { await Share.share({ message: `Think you've got a good memory? Challenge me on Blanked! playblanked.app/invite/${userId}` }); } catch {} }, [userId]);
  const handleChallenge = useCallback((friendId: string) => { const friend = friends.find(f => f.profile.id === friendId); setSelectedFriend(null); router.push({ pathname: '/game/challenge-select', params: { friendId, friendUsername: friend?.profile.username ?? 'friend' } }); }, [router, friends]);
  const handleRemoveFriend = useCallback(async (friendshipId: string) => { Alert.alert('Remove friend?', 'You can always add them back later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { await removeFriend(friendshipId); setSelectedFriend(null); loadData(); } }]); }, [loadData]);

  useEffect(() => { const refreshInterval = setInterval(() => { if (userId) loadData(); }, 30_000); return () => clearInterval(refreshInterval); }, [userId, loadData]);

  return (
    <TabTransition>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
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

        {searchResults.length > 0 && (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.card }]}>
            {searchResults.map((u) => (
              <View key={u.id} style={[styles.searchResultRow, { borderBottomColor: colors.border }]}>
                <Avatar username={u.username} color={u.avatar_color} size={32} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.searchResultName, { color: colors.text }]}>@{u.username}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight }}>World {u.highest_world} · {'\u2B50'} {u.total_stars}</Text>
                </View>
                {sentRequests.has(u.id) ? (<Text style={{ fontSize: 12, color: colors.textLight, fontWeight: '600' }}>Sent</Text>) : (
                  <Pressable style={[styles.addBtnSmall, { backgroundColor: colors.accent }]} onPress={() => handleSendRequest(u.id)}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Add</Text></Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {requests.length > 0 && (<><SectionLabel label="FRIEND REQUESTS" colors={colors} />{requests.map((r) => (<View key={r.id} style={[styles.requestCard, { backgroundColor: colors.card }]}><Avatar username={r.requester.username} color={r.requester.avatar_color} size={38} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.requestName, { color: colors.text }]}>@{r.requester.username}</Text><Text style={{ fontSize: 12, color: colors.textMid }}>Wants to be friends</Text></View><Pressable style={[styles.acceptBtn, { backgroundColor: colors.accent }]} onPress={() => handleAccept(r.id)}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Accept</Text></Pressable><Pressable style={styles.declineBtn} onPress={() => handleDecline(r.id)}><Ionicons name="close" size={18} color={colors.textLight} /></Pressable></View>))}</>)}

        {challenges.length > 0 && (<><SectionLabel label="ACTIVE CHALLENGES" colors={colors} />{challenges.map((c) => (<View key={c.id} style={[styles.challengeCard, { backgroundColor: colors.card }]}><View style={{ position: 'relative' }}><Avatar username={c.opponent.username} color={c.opponent.avatar_color} size={34} /><StatusDot lastActiveAt={c.opponent.last_seen} size={8} borderColor={colors.card} /></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={[styles.challengeText, { color: colors.text }]}>{c.my_score === null ? `@${c.opponent.username} challenged you${c.mode !== 'classic' ? ` to ${c.mode.replace(/_/g, ' ')}` : ''}` : `You vs @${c.opponent.username}`}</Text><Text style={{ fontSize: 11, color: colors.textMid }}>{c.level_ids.length} levels</Text></View>{c.my_score === null ? (<Pressable style={[styles.playBtn, { backgroundColor: colors.wrong }]} onPress={() => { const cMode = (c as any).mode ?? 'classic'; if (cMode === 'classic') { router.push({ pathname: '/game/challenge', params: { challengeId: c.id, mode: 'play' } }); } else { router.push({ pathname: '/game/challenge-mode', params: { challengeId: c.id, mode: cMode, action: 'play' } }); } }}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Play</Text></Pressable>) : (<View style={[styles.pendingBadge, { backgroundColor: colors.goldSoft }]}><Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>Pending</Text></View>)}</View>))}</>)}

        <SectionLabel label={`YOUR FRIENDS (${friends.length})`} colors={colors} />
        {friends.length === 0 ? (
          <View style={[styles.emptySection, { backgroundColor: colors.card }]}><Text style={[styles.emptyText, { color: colors.textLight }]}>No friends yet. Search for a username or share your invite link to get started.</Text></View>
        ) : (
          friends.map((f) => (
            <Pressable key={f.friendshipId} style={[styles.friendCard, { backgroundColor: colors.card }]} onPress={() => setSelectedFriend(f)}>
              <View style={{ position: 'relative' }}><Avatar username={f.profile.username} color={f.profile.avatar_color} size={40} /><StatusDot lastActiveAt={f.profile.last_seen} borderColor={colors.card} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.friendName, { color: colors.text }]}>@{f.profile.username}</Text><Text style={{ fontSize: 11, color: colors.textLight }}>{getLastActiveText(f.profile.last_seen)} · World {f.profile.highest_world} · {'\u2B50'} {f.profile.total_stars}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          ))
        )}

        {results.length > 0 && (<><SectionLabel label="LAST 3 RESULTS" colors={colors} />{results.map((r) => { const won = (r.my_score ?? 0) > (r.their_score ?? 0); const tied = r.my_score === r.their_score; return (<Pressable key={r.id} style={[styles.resultCard, { backgroundColor: colors.card }]} onPress={() => router.push({ pathname: '/game/challenge-result', params: { challengeId: r.id } })}><View style={[styles.resultBadge, { backgroundColor: tied ? colors.goldSoft : won ? colors.correctSoft : colors.wrongSoft }]}><Text style={{ fontSize: 11, fontWeight: '800', color: tied ? colors.gold : won ? colors.correct : colors.wrong }}>{tied ? 'T' : won ? 'W' : 'L'}</Text></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text }]}>vs @{r.opponent.username}</Text><Text style={{ fontSize: 11, color: colors.textMid }}>{r.my_score}% \u2014 {r.their_score}%</Text></View></Pressable>); })}</>)}

        <SectionLabel label="INVITE FRIENDS" colors={colors} />
        <View style={[styles.inviteCard, { backgroundColor: colors.card }]}>
          <Pressable style={[styles.inviteRow, { borderBottomColor: colors.border }]} onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setTimeout(() => searchInputRef.current?.focus(), 300); }}><Ionicons name="search-outline" size={20} color={colors.accent} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Add by username</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
          <Pressable style={styles.inviteRow} onPress={handleShare}><Ionicons name="share-outline" size={20} color={colors.correct} /><Text style={[styles.inviteRowText, { color: colors.text }]}>Share invite link</Text><Ionicons name="chevron-forward" size={18} color={colors.textLight} /></Pressable>
        </View>
      </ScrollView>

      {selectedFriend && (<FriendProfilePopup visible={true} friend={selectedFriend} colors={colors} onClose={() => setSelectedFriend(null)} onChallenge={handleChallenge} onRemove={handleRemoveFriend} />)}
    </SafeAreaView>
    </TabTransition>
  );
}

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
  searchResultsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  searchResultName: { fontSize: 14, fontWeight: '600' },
  addBtnSmall: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.lg },
  requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  requestName: { fontSize: 14, fontWeight: '600' },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  declineBtn: { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  challengeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  challengeText: { fontSize: 13, fontWeight: '600' },
  playBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  emptySection: { borderRadius: borderRadius.lg, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center', marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  friendCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  friendName: { fontSize: 14, fontWeight: '600' },
  resultCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  resultBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inviteCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  inviteRowText: { flex: 1, fontSize: 14, fontWeight: '500', marginLeft: spacing.md },
});
