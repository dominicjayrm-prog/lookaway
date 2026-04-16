/**
 * IncomingInviteListener — global, mounted once under AuthProvider.
 *
 * Subscribes to a Supabase realtime channel for every INSERT on
 * friend_challenges where challenged_id = me AND status = 'invited'.
 * When an invite lands, it surfaces a full-screen accept/decline
 * overlay with a 60-second countdown. On Accept the row flips to
 * 'live' and we route the current user into the game. On Decline
 * the row's status goes to 'declined' and the challenger is
 * notified.
 *
 * The modal is intentionally disruptive — pulses, can't be swiped
 * away mid-countdown, and plays a power-up-style sound — because
 * this is a time-critical real-time invite, not a passive notification.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Platform, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { acceptInvite, declineInvite, expireInvite } from '@/src/utils/challengeFlow';
import { CHALLENGE_MODES } from '@/src/data/challengeModes';
import { sounds } from '@/src/lib/sounds';

/** Cross-platform notification helper. Alert.alert does not render on
 *  React Native Web, so we fall back to window.alert there. Kept
 *  lightweight — error surfacing only, no dismiss callback. */
function notify(title: string, body?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).alert?.(body ? `${title}\n\n${body}` : title);
    return;
  }
  Alert.alert(title, body);
}

/** Routes where interrupting with a full-screen invite would hijack
 *  the player's attention mid-task. On these pages we still receive
 *  the realtime event, but we queue the invite into `pendingInvite`
 *  and surface it once the user returns to a neutral screen. */
const BLOCKED_ROUTE_PREFIXES = [
  '/game/',        // any active gameplay
  '/onboarding',   // don't derail someone finishing onboarding
  '/(auth)',       // pre-auth flows
];

function isBlockedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return BLOCKED_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

interface InviteRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  mode: string;
  mode_data: unknown;
  invite_expires_at: string | null;
  status: string;
}

interface ChallengerProfile {
  username: string;
  avatar_color: string;
}

export function IncomingInviteListener() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const [invite, setInvite] = useState<InviteRow | null>(null);
  // Pending invite holds the most recent invite the user received
  // while on a blocked route. When they leave that route we pull
  // the queued invite out and present it (if still valid).
  const [pendingInvite, setPendingInvite] = useState<InviteRow | null>(null);
  const [challenger, setChallenger] = useState<ChallengerProfile | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Track id of invite we've already shown/acted on, so the UPDATE
  // filter on the same row doesn't reopen the modal after Accept.
  const actedIdsRef = useRef<Set<string>>(new Set());
  // Fresh pathname ref so the realtime callback always sees the
  // CURRENT route, not the one captured when the subscription was
  // set up. Previously a user who logged in on the friends tab and
  // then navigated to /game/challenge-select had their pathname
  // frozen at the first value, so incoming invites were never
  // recognised as "blocked route" and a full-screen modal pop'd
  // over the mid-flow challenge-select screen — freezing taps.
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // Realtime subscription. Filter on challenged_id so every device
  // only receives invites meant for the logged-in user.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      // Unique per-mount suffix — see friends.tsx for context. The
      // global IncomingInviteListener mounts once under AuthProvider
      // but the hot-reload cycle + React StrictMode double-mount can
      // still race against channel cleanup on web.
      .channel(`incoming-invites-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_challenges',
          filter: `challenged_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as InviteRow;
          if (row.status !== 'invited') return;
          // Ignore invites we've already interacted with (defensive
          // against the UPDATE listener below re-firing).
          if (actedIdsRef.current.has(row.id)) return;

          // Resolve challenger profile for the modal (avatar + name).
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_color')
            .eq('id', row.challenger_id)
            .single();
          const resolvedChallenger = profile ?? { username: 'someone', avatar_color: '#6C5CE7' };

          // If the user is in the middle of something where a
          // full-screen modal would hijack attention, queue it. As
          // soon as they leave that route the other effect below
          // promotes the pending invite to the active slot. We still
          // play a subtle haptic so they know something happened.
          // Using pathnameRef.current (not the closure-captured
          // `pathname`) so this check sees the CURRENT route.
          if (isBlockedRoute(pathnameRef.current)) {
            setPendingInvite(row);
            setChallenger(resolvedChallenger);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            return;
          }

          setChallenger(resolvedChallenger);
          setInvite(row);

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          sounds.play('powerUp');
        },
      )
      // Also watch for UPDATEs — if the challenger cancels (via
      // row.status flip) or it expires, we should dismiss the modal.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_challenges',
          filter: `challenged_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as InviteRow;
          if (invite && row.id === invite.id && row.status !== 'invited') {
            // Challenger cancelled / it expired / we already acted.
            setInvite(null);
          }
          // Also clear a queued pending invite if it was invalidated
          // while we were on a blocked route.
          if (pendingInvite && row.id === pendingInvite.id && row.status !== 'invited') {
            setPendingInvite(null);
          }
        },
      )
      // DELETE handler — cancelInvite() is a row delete, not a status
      // change, so the UPDATE listener above never sees those events.
      // Without this, the invitee's modal stays open for the full 60s
      // after the challenger taps Cancel.
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friend_challenges',
          filter: `challenged_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.old as InviteRow;
          if (invite && row?.id === invite.id) setInvite(null);
          if (pendingInvite && row?.id === pendingInvite.id) setPendingInvite(null);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // Intentionally excluding `invite` — we always want the full
  // subscription active for the user's whole session. Reading the
  // latest invite inside the UPDATE handler via the captured state
  // is OK because we guard on id match.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Promote a queued invite to the active slot once the user
  // navigates back to a neutral route. Skip if the invite's
  // already expired in the meantime.
  useEffect(() => {
    if (!pendingInvite || isBlockedRoute(pathname)) return;
    if (pendingInvite.invite_expires_at && new Date(pendingInvite.invite_expires_at).getTime() < Date.now()) {
      setPendingInvite(null);
      return;
    }
    if (actedIdsRef.current.has(pendingInvite.id)) {
      setPendingInvite(null);
      return;
    }
    setInvite(pendingInvite);
    setPendingInvite(null);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    sounds.play('powerUp');
  }, [pathname, pendingInvite]);

  // Countdown from invite_expires_at. Re-computes every second and
  // auto-dismisses on zero. Pulses the scale every second for tension.
  //
  // On countdown hit zero we ALSO write status='expired' to the DB
  // so the challenger's waiting screen + every other client with a
  // subscription sees the invite become terminal immediately, rather
  // than waiting for the challenger's local timer to fire separately.
  useEffect(() => {
    if (!invite?.invite_expires_at) return;
    const endMs = new Date(invite.invite_expires_at).getTime();
    const inviteId = invite.id;
    let expiredWrite = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        if (!expiredWrite) {
          expiredWrite = true;
          // Fire-and-forget; eq('status','invited') guard means a
          // simultaneous write from the challenger is a no-op.
          expireInvite(inviteId).catch(() => {});
        }
        setInvite(null);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [invite?.invite_expires_at, invite?.id]);

  // Subtle pulse on the countdown pill so users feel the urgency.
  useEffect(() => {
    if (!invite) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [invite, pulseAnim]);

  if (!invite || !challenger) return null;

  const modeName = CHALLENGE_MODES[invite.mode ?? 'classic']?.name ?? invite.mode;

  async function handleAccept() {
    if (!invite) return;
    actedIdsRef.current.add(invite.id);
    const result = await acceptInvite(invite.id);
    if (result.ok) {
      sounds.play('correct');
      setInvite(null);
      // Route into the appropriate game screen with challengeId. The
      // row already has mode + mode_data populated so the game screen
      // can fetch and play without an extra round-trip.
      if (invite.mode === 'classic') {
        router.push({ pathname: '/game/challenge', params: { challengeId: invite.id, mode: 'play' } });
      } else {
        router.push({ pathname: '/game/challenge-mode', params: { challengeId: invite.id, mode: invite.mode, action: 'play' } });
      }
    } else {
      // Accept failed — either the row expired between render and tap
      // or a network blip. Surface a toast so the user isn't left
      // wondering why nothing happened, and dismiss the modal.
      setInvite(null);
      notify('Could not accept', 'That invite has expired or the network is unavailable. Ask your friend to send it again.');
    }
  }

  async function handleDecline() {
    if (!invite || !user?.id) return;
    actedIdsRef.current.add(invite.id);
    try {
      const { data: me } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const ok = await declineInvite(invite.id, me?.username, invite.challenger_id);
      if (!ok) notify('Could not decline', 'Your friend will still see the invite time out after 60s.');
    } catch {
      notify('Could not decline', 'Your friend will still see the invite time out after 60s.');
    }
    sounds.play('wrong');
    setInvite(null);
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleDecline}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: challenger.avatar_color }]}>
            <Text style={styles.avatarInitial}>{challenger.username[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            @{challenger.username} wants to play!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>{modeName}</Text>
          <Animated.View style={[styles.timerPill, { backgroundColor: colors.accent + '15', transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="time-outline" size={14} color={colors.accent} />
            <Text style={[styles.timerText, { color: colors.accent }]}>{secondsLeft}s to accept</Text>
          </Animated.View>

          <Pressable
            onPress={handleAccept}
            style={[styles.acceptBtn, { backgroundColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={`Accept challenge from ${challenger.username}`}
          >
            <Ionicons name="flash" size={18} color="#FFFFFF" />
            <Text style={styles.acceptText}>Accept & play</Text>
          </Pressable>
          <Pressable onPress={handleDecline} style={styles.declineBtn} accessibilityRole="button" accessibilityLabel="Decline challenge">
            <Text style={[styles.declineText, { color: colors.textMid }]}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 22, alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: -4 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginTop: 2 },
  timerText: { fontSize: 13, fontWeight: '800' },
  acceptBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  acceptText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  declineBtn: { paddingVertical: 8 },
  declineText: { fontSize: 14, fontWeight: '600' },
});
