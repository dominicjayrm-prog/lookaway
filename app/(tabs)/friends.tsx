import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, Share, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import * as Haptics from 'expo-haptics';

import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useGameStore } from '@/src/store';
import {
  searchUsers,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendRequests,
  getFriends,
  getActiveChallenges,
  getRecentResults,
  updateOnlineStatus,
  addFriendById,
} from '@/src/utils/friends';
import { declineChallenge, cancelOutgoingChallenge } from '@/src/utils/challengeFlow';
import type { FriendProfile, FriendRequest, Friend, Challenge } from '@/src/utils/friends';

import { FriendProfilePopup } from '@/src/components/FriendProfilePopup';
import LeaderboardSection from '@/src/components/LeaderboardSection';
import { FriendQRSheet } from '@/src/components/FriendQRSheet';
import { FriendQRScanner } from '@/src/components/FriendQRScanner';
import { FriendRequestToast, type ToastTone } from '@/src/components/FriendRequestToast';
import { readFriendsCache, writeFriendsCache } from '@/src/utils/friendsCache';
import { spacing } from '@/src/theme/spacing';

import { FriendsHeader } from '@/src/components/friends/FriendsHeader';
import { FriendSearchSection } from '@/src/components/friends/FriendSearchSection';
import { FriendRequestsSection } from '@/src/components/friends/FriendRequestsSection';
import { ActiveChallengesSection } from '@/src/components/friends/ActiveChallengesSection';
import { FriendsListSection } from '@/src/components/friends/FriendsListSection';
import { RecentResultsSection } from '@/src/components/friends/RecentResultsSection';
import { InviteFriendsSection } from '@/src/components/friends/InviteFriendsSection';
import { SectionLabel } from '@/src/components/friends/SectionLabel';

/**
 * Friends tab — composition root. All presentational chunks live in
 * `src/components/friends/` so this file can stay focused on state,
 * data loading, handlers, and modal orchestration.
 */
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

  const storeUsername = useGameStore((s) => s.username);
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

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Keep the header username in sync with the store's authoritative
  // value — hydrates instantly, then updates after cloud sync.
  useEffect(() => {
    if (storeUsername) setUsername(storeUsername);
  }, [storeUsername]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [req, fr, ch, res] = await Promise.all([
      getFriendRequests(userId),
      getFriends(userId),
      getActiveChallenges(userId),
      getRecentResults(userId, 3),
    ]);
    setRequests(req);
    setFriends(fr);
    setChallenges(ch);
    setResults(res);
    updateOnlineStatus(userId);
    // Persist the fresh blob so the next mount can hydrate without a flash.
    writeFriendsCache(userId, { friends: fr, requests: req, challenges: ch, results: res });
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchText.trim() || !userId) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const res = await searchUsers(searchText.trim(), userId);
      setSearchResults(res);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchText, userId]);

  const handleSendRequest = useCallback(
    async (addresseeId: string, addresseeUsername: string) => {
      if (!userId) return;
      // Use the consolidated helper so we catch already-friends / pending
      // cases instead of silently double-inserting.
      const outcome = await addFriendById(userId, addresseeId);
      if (outcome === 'sent') {
        setSentRequests((prev) => new Set(prev).add(addresseeId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setToast({
          title: `Request sent to @${addresseeUsername}`,
          subtitle: 'They will see it in their Friends tab',
          tone: 'success',
        });
      } else if (outcome === 'already_friends') {
        setSentRequests((prev) => new Set(prev).add(addresseeId));
        setToast({ title: `You and @${addresseeUsername} are already friends`, tone: 'info' });
      } else if (outcome === 'request_pending') {
        setSentRequests((prev) => new Set(prev).add(addresseeId));
        setToast({
          title: `Request to @${addresseeUsername} is pending`,
          subtitle: 'Hold tight, they haven\u2019t responded yet',
          tone: 'info',
        });
      } else if (outcome === 'self') {
        setToast({ title: 'You can\u2019t add yourself', tone: 'error' });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setToast({
          title: 'Couldn\u2019t send request',
          subtitle: 'Check your connection and try again',
          tone: 'error',
        });
      }
    },
    [userId],
  );

  const handleAccept = useCallback(
    async (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await acceptFriendRequest(id, userId);
      loadData();
    },
    [loadData, userId],
  );

  const handleDecline = useCallback(
    async (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      await declineFriendRequest(id);
      loadData();
    },
    [loadData],
  );

  /** Called when the addressee taps the X on an incoming challenge.
   *  We optimistically remove the row from local state and decline
   *  on Supabase in the background — confirmations via Alert.alert
   *  don't reliably render on Safari web, so we skip the prompt and
   *  surface the result as a toast instead. */
  const handleDeclineChallenge = useCallback(
    async (challengeId: string, opponentUsername: string) => {
      if (!userId) return;
      setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      const ok = await declineChallenge(challengeId, userId);
      if (ok) {
        setToast({ title: `Declined @${opponentUsername}'s challenge`, tone: 'info' });
      } else {
        setToast({ title: 'Couldn\u2019t decline challenge', subtitle: 'Try again in a moment', tone: 'error' });
        loadData();
      }
    },
    [userId, loadData],
  );

  /** Challenger bailing on a challenge they sent before the opponent
   *  played. Same optimistic-removal pattern as decline above. */
  const handleCancelOutgoing = useCallback(
    async (challengeId: string, _opponentUsername: string) => {
      if (!userId) return;
      setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      const ok = await cancelOutgoingChallenge(challengeId, userId);
      if (ok) {
        setToast({ title: 'Challenge cancelled', tone: 'info' });
      } else {
        setToast({ title: 'Couldn\u2019t cancel challenge', subtitle: 'Try again in a moment', tone: 'error' });
        loadData();
      }
    },
    [userId, loadData],
  );

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Think you've got a good memory? Challenge me on Blanked! playblanked.app/invite/${userId}`,
      });
    } catch {}
  }, [userId]);

  const handleChallenge = useCallback(
    (friendId: string) => {
      const friend = friends.find((f) => f.profile.id === friendId);
      setSelectedFriend(null);
      router.push({
        pathname: '/game/challenge-select',
        params: { friendId, friendUsername: friend?.profile.username ?? 'friend' },
      });
    },
    [router, friends],
  );

  const handleRemoveFriend = useCallback(
    async (friendshipId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Alert.alert('Remove friend?', 'You can always add them back later.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            await removeFriend(friendshipId);
            setSelectedFriend(null);
            loadData();
          },
        },
      ]);
    },
    [loadData],
  );

  const handlePlayClassic = useCallback(
    (challengeId: string) => {
      router.push({ pathname: '/game/challenge', params: { challengeId, mode: 'play' } });
    },
    [router],
  );

  const handlePlayMode = useCallback(
    (challengeId: string, mode: string) => {
      router.push({
        pathname: '/game/challenge-mode',
        params: { challengeId, mode, action: 'play' },
      });
    },
    [router],
  );

  const handleSelectResult = useCallback(
    (challengeId: string) => {
      router.push({ pathname: '/game/challenge-result', params: { challengeId } });
    },
    [router],
  );

  const handleFocusSearch = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => searchInputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (userId) loadData();
    }, 30_000);
    return () => clearInterval(refreshInterval);
  }, [userId, loadData]);

  // Refresh the moment the user lands on this tab. Without this, the
  // 30s polling interval could leave an incoming friend request
  // (inserted while the user was on another tab) hidden for almost
  // half a minute. Pairs with the realtime subscription below —
  // focus handles "user just came back", realtime handles "request
  // lands while user is already looking".
  useFocusEffect(
    useCallback(() => {
      if (userId) loadData();
    }, [userId, loadData]),
  );

  // Realtime subscription: wakes the list up the instant a
  // friendship row lands with us as the addressee. We refresh the
  // whole dataset rather than patching in-place because the join
  // that powers `requests` (via getFriendRequests) pulls the
  // requester's profile row, and we'd otherwise have to re-query
  // anyway. Status-change UPDATEs (e.g. the other side accepting
  // our outgoing request) also re-fetch so the friends list +
  // incoming list stay consistent.
  //
  // CRITICAL: we deliberately DON'T put `loadData` in the deps
  // array. Supabase Realtime refuses to add `.on()` handlers to a
  // channel after `.subscribe()` has fired — and since channel
  // names are global per-user, re-running this effect (which
  // happens every time loadData gets re-created) tries to bind
  // callbacks to the previous, already-subscribed channel and
  // throws:
  //   "cannot add postgres_changes callbacks after subscribe()"
  // That error bubbled up through the RootErrorBoundary on
  // navigations back to the Friends tab. Using a ref keeps the
  // callback current without re-subscribing.
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  useEffect(() => {
    if (!userId) return;
    // Unique channel name per mount. Using just `friendships-inbox-
    // ${userId}` meant that if the friends tab was torn down and
    // remounted fast enough (e.g. declining an invite then navigating
    // back) the removeChannel cleanup might not land BEFORE the new
    // effect tried to create a channel with the same name — Supabase
    // internally dedupes by channel name and returned the old,
    // already-subscribed channel, so the new .on() calls hit the
    // "cannot add postgres_changes callbacks after subscribe()"
    // failure and threw to the root error boundary. A per-mount
    // suffix (timestamp + random nonce) guarantees every mount gets
    // a fresh, uncontested channel slot.
    const mountId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(`friendships-inbox-${userId}-${mountId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        () => { loadDataRef.current(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` },
        () => { loadDataRef.current(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        () => { loadDataRef.current(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

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
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FriendsHeader username={username} onShare={handleShare} />

          <FriendSearchSection
            ref={searchInputRef}
            searchText={searchText}
            onChangeSearchText={setSearchText}
            searchFocused={searchFocused}
            onFocusChange={setSearchFocused}
            searchResults={searchResults}
            sentRequests={sentRequests}
            onSendRequest={handleSendRequest}
          />

          <FriendRequestsSection
            requests={requests}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />

          <ActiveChallengesSection
            challenges={challenges}
            onPlayClassic={handlePlayClassic}
            onPlayMode={handlePlayMode}
            onDeclineIncoming={handleDeclineChallenge}
            onCancelOutgoing={handleCancelOutgoing}
          />

          <FriendsListSection friends={friends} onSelectFriend={setSelectedFriend} />

          <SectionLabel label="LEADERBOARD" />
          <LeaderboardSection />

          <RecentResultsSection results={results} onSelectResult={handleSelectResult} />

          <InviteFriendsSection
            onAddByUsername={handleFocusSearch}
            onScanQR={() => setShowQRScanner(true)}
            onShowMyQR={() => setShowMyQR(true)}
            onShareInvite={handleShare}
          />
        </ScrollView>

        {selectedFriend && (
          <FriendProfilePopup
            visible={true}
            friend={selectedFriend}
            colors={colors}
            onClose={() => setSelectedFriend(null)}
            onChallenge={handleChallenge}
            onRemove={handleRemoveFriend}
          />
        )}
        <FriendQRSheet visible={showMyQR} onDismiss={() => setShowMyQR(false)} />
        <FriendQRScanner
          visible={showQRScanner}
          onDismiss={() => setShowQRScanner(false)}
          onFriendAdded={loadData}
        />
      </SafeAreaView>
    </TabTransition>
  );
}

export default FriendsTab;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
});
