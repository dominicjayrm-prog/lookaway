/**
 * Friend-challenge result screen.
 *
 * Core guarantee: neither player sees their own score, the opponent's
 * score, or the win/loss verdict until BOTH players have submitted.
 * This is the real-time "Clash Royale" UX — you finish, you see
 * "Waiting for @friend…" with a live subscription, and only when the
 * challenge row flips to status='completed' do the numbers reveal.
 *
 * Data flow:
 *   1. Load the row on mount. If both scores exist, skip straight to
 *      the reveal. Otherwise render the waiting state.
 *   2. Subscribe to postgres_changes on the row. When the other
 *      player finishes, the UPDATE event flips local state and the
 *      reveal animates in.
 *   3. Clean up the subscription on unmount.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { abandonChallenge } from '@/src/utils/challengeFlow';
import { spacing } from '@/src/theme/spacing';
import { FriendAvatar } from '@/src/components/FriendAvatar';

interface ChallengeRow {
  challenger_id: string;
  challenged_id: string;
  challenger_score: number | null;
  challenged_score: number | null;
  status: string | null;
  abandoned_by: string | null;
}

/**
 * The shape we hydrate from Supabase for each player — everything
 * FriendAvatar needs to render properly customised mascots on the
 * waiting + reveal screens. Previously this screen only pulled
 * `username` + `avatar_color` so both players always showed as
 * generic coloured initial circles; the 1v1 screens now match the
 * rest of the app.
 */
interface PlayerSkin {
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
  equippedFrame: string | null;
  equippedExpression: string | null;
}

interface ResultData {
  myScore: number;
  theirScore: number;
  me: PlayerSkin;
  them: PlayerSkin;
  friendId: string;
}

/**
 * PlayerAvatar — renders the player's equipped Blink / frame /
 * expression / uploaded photo via the shared FriendAvatar so the
 * 1v1 screens look the same as the friends list, leaderboard and
 * friend-profile popup. Adds a gold crown above the avatar when
 * `winner` is true.
 */
function PlayerAvatar({ skin, size = 72, winner = false }: { skin: PlayerSkin; size?: number; winner?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {winner && <Svg width={22} height={18} viewBox="0 0 24 24" style={{ marginBottom: 4 }}><Path d="M3,18 L5,8 L9,13 L12,5 L15,13 L19,8 L21,18 Z" fill="#D4A012" stroke="#D4A012" strokeWidth={1.5} strokeLinejoin="round" /></Svg>}
      <FriendAvatar
        username={skin.username}
        avatarColor={skin.avatarColor}
        avatarUrl={skin.avatarUrl}
        equippedFrame={skin.equippedFrame}
        equippedExpression={skin.equippedExpression}
        size={size}
        showDefaultRing
      />
    </View>
  );
}

function ChallengeResultScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [row, setRow] = useState<ChallengeRow | null>(null);
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse the "waiting" spinner so users know the screen is alive.
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // Initial fetch + realtime subscription. Subscribing up-front is
  // safe even if the row is already completed — we just unsub on
  // unmount and the callback is a no-op in the already-done case.
  useEffect(() => {
    if (!challengeId || !userId) return;
    let cancelled = false;

    async function load() {
      const { data: ch } = await supabase
        .from('friend_challenges')
        .select('challenger_id, challenged_id, challenger_score, challenged_score, status, abandoned_by')
        .eq('id', challengeId)
        .single();

      if (!ch || cancelled) { setLoading(false); return; }
      setRow(ch as ChallengeRow);

      const isChallenger = ch.challenger_id === userId;
      const friendId = isChallenger ? ch.challenged_id : ch.challenger_id;

      // Pull enough profile fields for FriendAvatar to render the
      // player's real customisation (frame / expression / uploaded
      // photo) instead of falling back to a plain coloured circle.
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_color, avatar_url, equipped_frame, equipped_expression')
        .in('id', [userId, friendId]);
      if (cancelled) return;

      const myProfile = profiles?.find((p) => p.id === userId);
      const theirProfile = profiles?.find((p) => p.id === friendId);

      const toSkin = (p: typeof myProfile, fallbackColor: string): PlayerSkin => ({
        username: p?.username ?? 'player',
        avatarColor: p?.avatar_color ?? fallbackColor,
        avatarUrl: p?.avatar_url ?? null,
        equippedFrame: p?.equipped_frame ?? null,
        equippedExpression: p?.equipped_expression ?? null,
      });

      setData({
        myScore: isChallenger ? (ch.challenger_score ?? 0) : (ch.challenged_score ?? 0),
        theirScore: isChallenger ? (ch.challenged_score ?? 0) : (ch.challenger_score ?? 0),
        me: toSkin(myProfile, '#6C5CE7'),
        them: toSkin(theirProfile, '#0984E3'),
        friendId,
      });
      setLoading(false);
    }

    load();

    // Realtime: watch for the opponent finishing. This gives the
    // winner a live "they finished!" flip to the reveal screen
    // without any polling.
    const channel = supabase
      .channel(`challenge-result-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_challenges', filter: `id=eq.${challengeId}` },
        (payload) => {
          const next = payload.new as ChallengeRow;
          setRow(next);
          setData((prev) => {
            if (!prev) return prev;
            const isChallenger = next.challenger_id === userId;
            return {
              ...prev,
              myScore: isChallenger ? (next.challenger_score ?? 0) : (next.challenged_score ?? 0),
              theirScore: isChallenger ? (next.challenged_score ?? 0) : (next.challenger_score ?? 0),
            };
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [challengeId, userId]);

  // Rematch — route back to challenge-select with the friend already
  // identified. This preserves mode (previously a speed_recall
  // rematch silently became classic because we used createChallenge)
  // AND lets the online-status check re-run cleanly: if the friend
  // went offline since the last match, challenge-select shows the
  // offline fallback; if they're still online, it kicks off a fresh
  // live invite.
  const handleRematch = () => {
    if (!data) return;
    router.replace({
      pathname: '/game/challenge-select',
      params: { friendId: data.friendId, friendUsername: data.them.username },
    });
  };

  if (loading || !data || !row) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.loadingText, { color: colors.textMid }]}>Loading result...</Text>
      </SafeAreaView>
    );
  }

  // Terminal state: one of the players bailed mid-match. Flip to
  // the "opponent left" screen instead of waiting for scores that
  // will never come. abandoned_by tells us who to blame.
  if (row.status === 'abandoned') {
    const iAbandoned = row.abandoned_by === userId;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.content}>
          <View style={[styles.abandonedIcon, { backgroundColor: colors.wrongSoft }]}>
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path d="M13 14L12 20 11 14 5 13 11 12 12 6 13 12 19 13Z" fill={colors.wrong} opacity={0.3} />
              <Path d="M16 4L8 20" stroke={colors.wrong} strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {iAbandoned ? 'You left the match' : `@${data.them.username} left`}
          </Text>
          <Text style={[styles.waitingBody, { color: colors.textMid }]}>
            {iAbandoned
              ? "You'll skip straight back to friends. No result recorded."
              : 'Your opponent closed the game before finishing. The match has been cancelled.'}
          </Text>
          <View style={styles.buttons}>
            {!iAbandoned && (
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleRematch}>
                <Text style={styles.primaryBtnText}>Send a new challenge</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryLink} onPress={() => router.replace('/(tabs)/friends')}>
              <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to friends</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Both sides must have submitted for the reveal to show. Any time
  // a score is still null, we render the waiting screen regardless
  // of `status`.
  const bothFinished =
    row.challenger_score !== null &&
    row.challenged_score !== null &&
    row.status === 'completed';

  if (!bothFinished) {
    const mySubmitted = (row.challenger_id === userId ? row.challenger_score : row.challenged_score) !== null;
    const theirSubmitted = (row.challenger_id === userId ? row.challenged_score : row.challenger_score) !== null;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.content}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </Animated.View>
          <Text style={[styles.title, { color: colors.text, marginTop: 24 }]}>
            Waiting for @{data.them.username}…
          </Text>
          <Text style={[styles.waitingBody, { color: colors.textMid }]}>
            {mySubmitted && !theirSubmitted
              ? `You've finished. ${data.them.username} is still playing — results unlock when they're done.`
              : !mySubmitted && theirSubmitted
                ? `${data.them.username} finished first. Your score will reveal once you play.`
                : 'Results will appear once both of you have played.'}
          </Text>
          <View style={[styles.waitingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.waitingPlayer}>
              <PlayerAvatar skin={data.me} size={44} />
              <Text style={[styles.waitingName, { color: colors.text }]}>You</Text>
              <Text style={[styles.waitingStatus, { color: mySubmitted ? colors.correct : colors.textLight }]}>
                {mySubmitted ? '\u2713 Done' : 'Playing…'}
              </Text>
            </View>
            <Text style={[styles.vsText, { color: colors.textLight }]}>VS</Text>
            <View style={styles.waitingPlayer}>
              <PlayerAvatar skin={data.them} size={44} />
              <Text style={[styles.waitingName, { color: colors.text }]}>@{data.them.username}</Text>
              <Text style={[styles.waitingStatus, { color: theirSubmitted ? colors.correct : colors.textLight }]}>
                {theirSubmitted ? '\u2713 Done' : 'Playing…'}
              </Text>
            </View>
          </View>
          {/* "Leave for now" now ALSO calls abandonChallenge so the
              opponent's realtime subscription flips their UI to
              "your opponent left" — previously it only navigated the
              leaver away and the other side kept "waiting" forever.
              Guarded by status so we don't abandon an already-
              completed match (edge case: both submit, realtime lags,
              user taps Leave before the reveal renders). */}
          <Pressable style={styles.secondaryLink} onPress={async () => {
            try {
              if (userId && challengeId && row?.status !== 'completed' && row?.status !== 'abandoned') {
                await abandonChallenge(challengeId, userId);
              }
            } catch {}
            router.replace('/(tabs)/friends');
          }}>
            <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Leave for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <RevealScreen data={data} onRematch={handleRematch} onBack={() => router.replace('/(tabs)/friends')} colors={colors} />;
}

/**
 * The "big reveal" screen, extracted so we can scope the win
 * animation (useRef, useEffect) to the moment both players have
 * finished — no point mounting an Animated.Value on the waiting
 * screen that'll never fire. The winner avatar springs up into
 * place while the banner fades in, which gives the moment a bit
 * of weight instead of just popping into view.
 */
function RevealScreen({
  data,
  onRematch,
  onBack,
  colors,
}: {
  data: ResultData;
  onRematch: () => void;
  onBack: () => void;
  colors: Record<string, string>;
}) {
  const won = data.myScore > data.theirScore;
  const lost = data.theirScore > data.myScore;
  const tied = data.myScore === data.theirScore;
  const resultText = tied ? "It's a tie!" : won ? 'You won!' : 'They won!';
  const resultColor = tied ? colors.gold : won ? colors.correct : colors.wrong;

  const winnerScale = useRef(new Animated.Value(0.6)).current;
  const winnerOpacity = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(winnerScale, {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(winnerOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [winnerScale, winnerOpacity, bannerOpacity]);

  // Winner avatar gets the spring-in. Loser avatar just fades in
  // alongside the winner's pop — they shouldn't both get hero
  // treatment or the celebration reads as shared.
  const myAnim = won ? { transform: [{ scale: winnerScale }], opacity: winnerOpacity } : { opacity: winnerOpacity };
  const theirAnim = lost ? { transform: [{ scale: winnerScale }], opacity: winnerOpacity } : { opacity: winnerOpacity };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.accent }]}>Challenge Complete!</Text>

        {/* Avatars — winner springs up, loser fades in */}
        <View style={styles.avatarRow}>
          <Animated.View style={[styles.playerCol, myAnim]}>
            <PlayerAvatar skin={data.me} winner={won} />
            <Text style={[styles.playerName, { color: colors.text }]}>You</Text>
          </Animated.View>
          <Text style={[styles.vsText, { color: colors.textLight }]}>VS</Text>
          <Animated.View style={[styles.playerCol, theirAnim]}>
            <PlayerAvatar skin={data.them} winner={lost} />
            <Text style={[styles.playerName, { color: colors.text }]}>@{data.them.username}</Text>
          </Animated.View>
        </View>

        {/* Score row with a clear label above the numbers. Previously
            it was "28% vs 64%" with no context, which left players
            asking "percent of what?". Labelling it Memory Score
            matches the terminology used on the solo result screen
            and in the app's analytics. */}
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreLabel, { color: colors.textMid }]}>Memory Score</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: won ? colors.correct : colors.text }]}>{data.myScore}%</Text>
            <View style={{ width: 40 }} />
            <Text style={[styles.score, { color: lost ? colors.correct : colors.text }]}>{data.theirScore}%</Text>
          </View>
        </View>

        {/* Result banner fades in after the avatars settle */}
        <Animated.View style={[styles.resultBadge, { backgroundColor: resultColor + '15', opacity: bannerOpacity }]}>
          <Text style={[styles.resultText, { color: resultColor }]}>{won ? '\u{1F3C6} ' : ''}{resultText}</Text>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={onRematch}>
            <Text style={styles.primaryBtnText}>Rematch</Text>
          </Pressable>
          <Pressable style={styles.secondaryLink} onPress={onBack}>
            <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Back to friends</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ChallengeResultScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  waitingBody: { fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 20, marginTop: -8 },
  abandonedIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 18, borderWidth: 1, width: '100%', maxWidth: 340, marginTop: 12 },
  waitingPlayer: { alignItems: 'center', gap: 6, flex: 1 },
  waitingName: { fontSize: 13, fontWeight: '600' },
  waitingStatus: { fontSize: 11, fontWeight: '700' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 8 },
  playerCol: { alignItems: 'center', gap: 8 },
  avatar: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  playerName: { fontSize: 14, fontWeight: '600' },
  vsText: { fontSize: 14, fontWeight: '700' },
  scoreBlock: { alignItems: 'center', gap: 4 },
  scoreLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 32, fontWeight: '800' },
  resultBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  resultText: { fontSize: 18, fontWeight: '700' },
  buttons: { width: '100%', maxWidth: 280, marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryLink: { paddingVertical: 8 },
  secondaryLinkText: { fontSize: 14, fontWeight: '600' },
  loadingText: { fontSize: 15, textAlign: 'center' },
});
