/**
 * Challenge waiting screen — challenger-side landing page while the
 * invite lives as status='invited'. We show:
 *
 *   • An avatar + "Waiting for @friend to accept…" hero
 *   • Live countdown from invite_expires_at
 *   • Cancel button that deletes the row
 *   • A realtime subscription so the moment the friend accepts
 *     (status flips to 'live') we jump them into the game with the
 *     shared mode_data already in the row.
 *
 * If the friend declines, the invite expires, or the connection
 * drops, we land on a polite terminal state with a back-to-friends
 * button — never stranded.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { cancelInvite, expireInvite } from '@/src/utils/challengeFlow';
import { CHALLENGE_MODES } from '@/src/data/challengeModes';
import { FriendAvatar } from '@/src/components/FriendAvatar';

interface InviteRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  mode: string;
  status: string;
  invite_expires_at: string | null;
}

interface FriendProfile {
  avatar_url?: string | null;
  equipped_frame?: string | null;
  equipped_expression?: string | null;
  username: string;
  avatar_color: string;
}

type TerminalState = 'declined' | 'expired' | 'cancelled' | null;

export default function ChallengeWaitingScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [terminal, setTerminal] = useState<TerminalState>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  // Guard so realtime + poll don't both fire routeIntoGame and
  // cause a double navigation.
  const routedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initial fetch + realtime subscription. If the row is already past
  // 'invited' when we mount (e.g. user came back to the tab after it
  // was accepted on another device), immediately route onward.
  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;

    async function load() {
      const { data: ch } = await supabase
        .from('friend_challenges')
        .select('id, challenger_id, challenged_id, mode, status, invite_expires_at')
        .eq('id', challengeId)
        .single();
      if (!ch || cancelled) return;

      // Verify the viewer IS the challenger. Guards against a
      // challenged user (or anyone) deep-linking here to inspect
      // someone else's invite. Also protects against stray route
      // transitions from rematch buttons etc.
      if (user?.id && ch.challenger_id !== user.id) {
        setUnauthorized(true);
        return;
      }

      setInvite(ch as InviteRow);

      if (ch.status === 'live' || ch.status === 'completed') {
        // Accepted while we weren't looking — jump straight in.
        routeIntoGame(ch as InviteRow);
        return;
      }
      if (ch.status === 'declined') { setTerminal('declined'); return; }
      if (ch.status === 'expired') { setTerminal('expired'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_color, avatar_url, equipped_frame, equipped_expression')
        .eq('id', ch.challenged_id)
        .single();
      if (!cancelled) setFriend(profile ?? { username: 'friend', avatar_color: '#6C5CE7' });
    }

    load();

    const channel = supabase
      .channel(`challenge-waiting-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_challenges', filter: `id=eq.${challengeId}` },
        (payload) => {
          if (terminal || routedRef.current) return;
          const next = payload.new as InviteRow;
          setInvite(next);
          if (next.status === 'live') {
            routeIntoGame(next);
          } else if (next.status === 'declined') {
            setTerminal('declined');
          } else if (next.status === 'expired') {
            setTerminal('expired');
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'friend_challenges', filter: `id=eq.${challengeId}` },
        () => { if (!terminal && !routedRef.current) setTerminal('cancelled'); },
      )
      .subscribe();

    // Realtime-event-lost fallback: poll every 4s for status changes.
    // Realtime is usually fine but can be delayed on flaky networks,
    // and the whole invite-acceptance UX relies on the challenger
    // learning about the "live" transition within seconds. Cheap
    // insurance — only running while this screen is mounted.
    const pollId = setInterval(async () => {
      if (cancelled || terminal || routedRef.current) return;
      const { data: poll } = await supabase
        .from('friend_challenges')
        .select('id, challenger_id, challenged_id, mode, status, invite_expires_at')
        .eq('id', challengeId)
        .single();
      if (!poll || cancelled || terminal || routedRef.current) return;
      setInvite(poll as InviteRow);
      if (poll.status === 'live') routeIntoGame(poll as InviteRow);
      else if (poll.status === 'declined') setTerminal('declined');
      else if (poll.status === 'expired') setTerminal('expired');
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, user?.id]);

  function routeIntoGame(row: InviteRow) {
    if (routedRef.current) return;       // double-nav guard
    routedRef.current = true;
    if (row.mode === 'classic') {
      router.replace({ pathname: '/game/challenge', params: { challengeId: row.id, mode: 'play' } });
    } else {
      router.replace({ pathname: '/game/challenge-mode', params: { challengeId: row.id, mode: row.mode, action: 'play' } });
    }
  }

  // Countdown timer anchored to invite_expires_at so the challenger
  // and the challenged see a consistent remaining time.
  //
  // On countdown-to-zero we ALSO call expireInvite() to flip the DB
  // row to status='expired'. Without this, the row sits at 'invited'
  // until the next expireOldChallenges() sweep (on friends-tab
  // focus), which can be hours away if neither player opens Friends.
  useEffect(() => {
    if (!invite?.invite_expires_at || terminal) return;
    const endMs = new Date(invite.invite_expires_at).getTime();
    const inviteId = invite.id;
    let expiredWrite = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        if (!expiredWrite) {
          expiredWrite = true;
          expireInvite(inviteId).catch(() => {});
        }
        setTerminal('expired');
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [invite?.invite_expires_at, invite?.id, terminal]);

  // Pulse the "waiting" icon while the countdown is running.
  useEffect(() => {
    if (terminal) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [terminal, pulseAnim]);

  async function handleCancel() {
    if (challengeId) await cancelInvite(challengeId);
    router.back();
  }

  if (unauthorized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.terminalTitle, { color: colors.text }]}>Not your invite</Text>
          <Text style={[styles.terminalBody, { color: colors.textMid }]}>
            This invite belongs to another player. Head back to see your active challenges.
          </Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => router.replace('/(tabs)/friends')}>
            <Text style={styles.primaryBtnText}>Back to friends</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (terminal) {
    const message = terminal === 'declined'
      ? `@${friend?.username ?? 'they'} declined the challenge.`
      : terminal === 'expired'
        ? `@${friend?.username ?? 'they'} didn\u2019t respond in time.`
        : 'Invite cancelled.';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <View style={[styles.iconCircle, { backgroundColor: colors.wrongSoft }]}>
            <Ionicons name={terminal === 'declined' ? 'close-circle-outline' : 'time-outline'} size={32} color={colors.wrong} />
          </View>
          <Text style={[styles.terminalTitle, { color: colors.text }]}>
            {terminal === 'declined' ? 'Challenge declined' : terminal === 'expired' ? 'Invite expired' : 'Cancelled'}
          </Text>
          <Text style={[styles.terminalBody, { color: colors.textMid }]}>{message}</Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.replace('/(tabs)/friends')}
            accessibilityRole="button"
            accessibilityLabel="Back to friends"
          >
            <Text style={styles.primaryBtnText}>Back to friends</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const modeName = invite ? (CHALLENGE_MODES[invite.mode]?.name ?? invite.mode) : 'Challenge';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.centered}>
        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
          {/* Render the friend's real customisation (equipped frame /
              expression / uploaded photo) via the shared FriendAvatar,
              not a bare initials pill. Matches the waiting / reveal
              screens in challenge-result + the friends tab. */}
          <FriendAvatar
            username={friend?.username}
            avatarColor={friend?.avatar_color ?? colors.accent}
            avatarUrl={friend?.avatar_url}
            equippedFrame={friend?.equipped_frame}
            equippedExpression={friend?.equipped_expression}
            size={96}
            showDefaultRing
          />
        </Animated.View>
        {/* JSX text content doesn't interpret JS escape sequences —
            `\u2026` and `\u2019` appeared literally on screen. Using
            the actual characters inline fixes the rendering. */}
        <Text style={[styles.title, { color: colors.text }]}>
          Waiting for @{friend?.username ?? 'friend'}…
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMid }]}>
          They’re being invited to a {modeName} match right now.
        </Text>
        <View style={[styles.countdown, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="time" size={18} color={colors.accent} />
          <Text style={[styles.countdownText, { color: colors.accent }]}>
            {secondsLeft}s to respond
          </Text>
        </View>
        <Pressable
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel the invite"
        >
          <Text style={[styles.cancelText, { color: colors.textMid }]}>Cancel invite</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const { width: SW } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  avatarWrap: { marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: SW * 0.8, lineHeight: 20 },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  countdownText: { fontSize: 15, fontWeight: '800' },
  cancelBtn: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 },
  cancelText: { fontSize: 14, fontWeight: '700' },
  iconCircle: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  terminalTitle: { fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  terminalBody: { fontSize: 14, textAlign: 'center', maxWidth: SW * 0.8, lineHeight: 20 },
  primaryBtn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
