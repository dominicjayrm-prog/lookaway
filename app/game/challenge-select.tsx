/**
 * Challenge → Choose a mode.
 *
 * After the Unified Brain Journey rollout, all six modes are peers from
 * Level 1 — there's no "Classic is the main thing, the rest are
 * exclusives" hierarchy anymore. This screen reflects that: a clean
 * 2-column grid of six identical cards, plus a Rematch chip for
 * opponents you challenged in the last 48 hours, plus a premium
 * friend-aware header.
 *
 * Difficulty is auto-matched based on both players' unified positions;
 * no more manual Easy/Medium/Hard picker. Online-only invites stay as
 * they were (no async fallback).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { CHALLENGE_MODES, MODE_ORDER } from '@/src/data/challengeModes';
import {
  isUserOnline,
  sendInvite,
  pickChallengeLevelsAutoMatch,
  getRecentChallengeWithFriend,
  type RecentFriendChallenge,
} from '@/src/utils/challengeFlow';
import {
  generateSpeedRecallData,
  generateSnapMatchData,
  generateSequenceData,
  generateCountingBlitzData,
  generateColourChainData,
} from '@/src/utils/modeGenerators';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { ChallengeModeCard } from '@/src/components/challenge/ChallengeModeCard';
import { RematchChip } from '@/src/components/challenge/RematchChip';

function notify(title: string, body: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).alert?.(`${title}\n\n${body}`);
    return;
  }
  Alert.alert(title, body);
}

const REMATCH_DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;
const rematchDismissKey = (friendId: string) => `rematch_dismissed_${friendId}`;

interface FriendProfile {
  username: string;
  avatar_color: string;
  avatar_url: string | null;
  equipped_frame: string | null;
  equipped_expression: string | null;
  last_seen: string | null;
  unified_position: number;
}

function ChallengeSelectScreen() {
  const { friendId, friendUsername } = useLocalSearchParams<{ friendId: string; friendUsername: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [selectedMode, setSelectedMode] = useState('classic');
  const [friendOnline, setFriendOnline] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [recent, setRecent] = useState<RecentFriendChallenge | null>(null);
  // Ref-backed "sending" guard so a rapid double-tap can't queue two
  // invites in the same tick (setState is async; `sending` the state
  // lags behind). Every send path checks and sets the ref before
  // setState.
  const sendingRef = useRef(false);
  // Fallback to Classic metadata if `selectedMode` ever ends up
  // pointing at a mode not in CHALLENGE_MODES (e.g. a stale rematch
  // row from a retired mode). Prevents the bottom-bar + auto-match
  // hint from crashing on `.color` / `.name` access.
  const selected = CHALLENGE_MODES[selectedMode] ?? CHALLENGE_MODES.classic;

  // Bottom-bar enter animation — slides up from below with a subtle
  // spring so the screen feels alive on mount.
  const footerY = useSharedValue(80);
  const footerOpacity = useSharedValue(0);
  useEffect(() => {
    footerOpacity.value = withDelay(220, withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }));
    footerY.value = withDelay(220, withSpring(0, { damping: 16, stiffness: 160 }));
  }, [footerY, footerOpacity]);
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerY.value }],
  }));

  // Fetch the friend's full profile once on mount — powers the
  // premium header (avatar + status dot) and is the baseline we
  // use for auto-match level picking.
  useEffect(() => {
    if (!friendId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_color, avatar_url, equipped_frame, equipped_expression, last_seen, unified_position')
          .eq('id', friendId)
          .single();
        if (data) {
          setFriendProfile({
            username: data.username ?? friendUsername ?? 'friend',
            avatar_color: data.avatar_color ?? '#6C5CE7',
            avatar_url: data.avatar_url ?? null,
            equipped_frame: data.equipped_frame ?? null,
            equipped_expression: data.equipped_expression ?? null,
            last_seen: data.last_seen ?? null,
            unified_position: data.unified_position ?? 1,
          });
        }
      } catch {
        // Non-fatal — header degrades gracefully to an initials fallback.
      }
    })();
  }, [friendId, friendUsername]);

  // Fetch the most recent completed challenge with this friend so we
  // can surface the Rematch chip. Respects a per-friend 24h dismiss
  // flag stored in AsyncStorage so dismissing persists between opens.
  useEffect(() => {
    if (!user?.id || !friendId) return;
    (async () => {
      try {
        const dismissedAt = await AsyncStorage.getItem(rematchDismissKey(friendId));
        if (dismissedAt) {
          const age = Date.now() - Number(dismissedAt);
          if (age < REMATCH_DISMISS_WINDOW_MS) return;
        }
        const r = await getRecentChallengeWithFriend(user.id, friendId);
        if (r) setRecent(r);
      } catch {}
    })();
  }, [user?.id, friendId]);

  // Poll friend's online status every 5s. The 2-min last_seen
  // threshold lives in challengeFlow.isUserOnline.
  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;
    const check = () => {
      isUserOnline(friendId).then((on) => {
        if (!cancelled) setFriendOnline(on);
      });
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [friendId]);

  /** Build the mode-specific shared seed both players will see.
   *  Takes `mode` explicitly so rematch / prefilled flows don't have
   *  to wait for React's state update to propagate before they can
   *  send. Classic auto-picks levels from the world range matching
   *  the average of both players' unified positions; other modes
   *  generate a deterministic blob locally. */
  const buildSharedSeed = useCallback(
    async (
      mode: string,
      userId: string,
      targetId: string,
    ): Promise<{ modeData: unknown; levelIds: string[] }> => {
      if (mode === 'classic') {
        const { levelIds, difficulty, avgPosition } = await pickChallengeLevelsAutoMatch(userId, targetId);
        return { modeData: { difficulty, avgPosition }, levelIds };
      }
      if (mode === 'speed_recall') return { modeData: generateSpeedRecallData(), levelIds: [] };
      if (mode === 'snap_match') return { modeData: generateSnapMatchData(), levelIds: [] };
      if (mode === 'sequence') return { modeData: generateSequenceData(), levelIds: [] };
      if (mode === 'counting_blitz') return { modeData: generateCountingBlitzData(), levelIds: [] };
      if (mode === 'colour_chain') return { modeData: generateColourChainData(), levelIds: [] };
      return { modeData: {}, levelIds: [] };
    },
    [],
  );

  /** Fire the real invite for `mode`. Always pass the mode explicitly
   *  — never read from `selectedMode` state here — so rematch flows
   *  that rely on a fresh mode selection can send immediately without
   *  waiting for a re-render. sendingRef blocks rapid double-taps at
   *  tick granularity before setState has propagated. */
  const startInstantInvite = useCallback(
    async (mode: string) => {
      if (!user?.id || !friendId) return;
      if (sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      try {
        const { modeData, levelIds } = await buildSharedSeed(mode, user.id, friendId);
        if (mode === 'classic' && levelIds.length === 0) {
          notify(t('challenge.cannot_create_title'), t('challenge.cannot_create_body'));
          return;
        }
        const id = await sendInvite({
          challengerId: user.id,
          challengedId: friendId,
          mode,
          modeData,
          levelIds,
        });
        if (!id) {
          notify(t('challenge.could_not_send_title'), t('challenge.could_not_send_body'));
          return;
        }
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        router.replace({ pathname: '/game/challenge-waiting', params: { challengeId: id } });
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [user?.id, friendId, buildSharedSeed, router],
  );

  /** Gate: only allow sending when the friend is online. When not, fire
   *  a Warning haptic and surface the "friend is offline" modal. Re-
   *  polls once on tap so a friend who came online between 5s polls
   *  isn't held back. */
  const attemptSendForMode = useCallback(
    (mode: string) => {
      if (friendOnline === true) {
        startInstantInvite(mode);
        return;
      }
      if (friendId) {
        isUserOnline(friendId).then((online) => {
          if (online) {
            setFriendOnline(true);
            startInstantInvite(mode);
            return;
          }
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
          notify(
            t('challenge.friend_offline_title', { username: friendUsername || 'friend' }),
            t('challenge.offline_body'),
          );
        });
      } else {
        notify(t('challenge.friend_unavailable_title'), t('challenge.friend_not_found_body'));
      }
    },
    [friendOnline, friendId, friendUsername, startInstantInvite],
  );

  /** Bottom-bar CTA handler — always sends the currently-selected mode. */
  const handleStart = useCallback(() => {
    attemptSendForMode(selectedMode);
  }, [attemptSendForMode, selectedMode]);

  /** Rematch chip handler — picks the mode from the recent match and
   *  sends it DIRECTLY via attemptSendForMode(recent.mode). The old
   *  implementation relied on setSelectedMode + a 260ms setTimeout
   *  which captured a stale handleStart closure and could send the
   *  previously-selected mode instead of the rematch one. */
  const handleRematch = useCallback(() => {
    if (!recent) return;
    if (!CHALLENGE_MODES[recent.mode]) return; // stale / retired mode, no-op
    setSelectedMode(recent.mode);
    attemptSendForMode(recent.mode);
  }, [recent, attemptSendForMode]);

  const handleRematchDismiss = useCallback(async () => {
    if (!friendId) return;
    try {
      await AsyncStorage.setItem(rematchDismissKey(friendId), String(Date.now()));
    } catch {}
    setRecent(null);
  }, [friendId]);

  const statusText = friendOnline === null
    ? '…'
    : friendOnline
      ? t('challenge.status_online')
      : t('challenge.status_offline');

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Premium header — friend avatar + @username + online dot */}
      <View style={st.header}>
        <Pressable
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M15,4 L7,12 L15,20"
              fill="none"
              stroke={colors.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <View style={st.headerCenter}>
          <View style={st.avatarWrap}>
            <FriendAvatar
              username={friendProfile?.username ?? friendUsername ?? undefined}
              avatarColor={friendProfile?.avatar_color ?? '#6C5CE7'}
              avatarUrl={friendProfile?.avatar_url}
              equippedFrame={friendProfile?.equipped_frame}
              equippedExpression={friendProfile?.equipped_expression}
              size={40}
              showDefaultRing
            />
            <View
              style={[
                st.presenceRing,
                {
                  // Three states: online = green, offline = grey,
                  // loading (null) = transparent so we don't mislead
                  // the user into thinking the friend is offline
                  // while we're still fetching their status.
                  backgroundColor: friendOnline === true
                    ? '#00B894'
                    : friendOnline === false
                      ? colors.borderStrong
                      : 'transparent',
                  borderColor: colors.bg,
                },
              ]}
            />
          </View>
          <View style={st.headerText}>
            <Text style={[st.headerTitle, { color: colors.text }]} numberOfLines={1}>
              @{friendProfile?.username ?? friendUsername ?? 'friend'}
            </Text>
            <Text style={[st.headerSub, { color: friendOnline ? '#00B894' : colors.textMid }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Placeholder keeps the header symmetrical (back button on
         *  the left, equal-width empty spacer on the right). */}
        <View style={st.backBtn} />
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Rematch chip — shows only if there's a completed match in
         *  the last 48h that hasn't been dismissed. */}
        {recent && (
          <RematchChip
            recent={recent}
            onTap={handleRematch}
            onDismiss={handleRematchDismiss}
          />
        )}

        {/* Section title */}
        <Text style={[st.sectionTitle, { color: colors.textMid }]}>
          {t('challenge.choose_mode')}
        </Text>

        {/* 2x3 peer grid of all six modes */}
        <View style={st.grid}>
          {MODE_ORDER.map((id, idx) => {
            const mode = CHALLENGE_MODES[id];
            return (
              <ChallengeModeCard
                key={id}
                mode={mode}
                isSelected={selectedMode === id}
                onPress={() => setSelectedMode(id)}
                enterDelay={idx * 60}
              />
            );
          })}
        </View>

        {/* Auto-match hint — only shown when Classic is selected so
         *  the player understands the old Easy/Medium/Hard picker is
         *  gone by design, not by accident. */}
        {selectedMode === 'classic' && (
          <AutoMatchHint
            color={CHALLENGE_MODES.classic.color}
            textColor={colors.textMid}
            friendPosition={friendProfile?.unified_position}
          />
        )}
      </ScrollView>

      {/* Bottom docked bar — lean. Selected mode mini-card + CTA. */}
      <Animated.View
        style={[
          st.bottomBar,
          { backgroundColor: colors.bg, borderTopColor: colors.border },
          footerStyle,
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            st.startBtn,
            {
              backgroundColor: selected.color,
              opacity: sending ? 0.6 : pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
              shadowColor: selected.color,
            },
          ]}
          onPress={handleStart}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={friendOnline ? t('challenge.send_invite_aria') : t('challenge.offline_cta')}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={st.startBtnText}>
                {friendOnline ? t('challenge.invite_cta') : t('challenge.offline_cta')}
              </Text>
              <Text style={st.startBtnSub}>
                {selected.name} · {selected.roundLabel} · {selected.estimatedTime}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

/** Tiny label under the grid letting the player know difficulty is
 *  handled automatically for Classic. Keeps the grid itself clean. */
function AutoMatchHint({
  color,
  textColor,
  friendPosition,
}: {
  color: string;
  textColor: string;
  friendPosition?: number;
}) {
  return (
    <View style={[st.hint, { borderColor: color + '22' }]}>
      <View style={[st.hintDot, { backgroundColor: color }]} />
      <Text style={[st.hintText, { color: textColor }]}>
        {friendPosition
          ? t('challenge.auto_match_hint_with_level', { level: friendPosition })
          : t('challenge.auto_match_hint')}
      </Text>
    </View>
  );
}

export default ChallengeSelectScreen;

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  presenceRing: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 12,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  startBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  startBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
});
