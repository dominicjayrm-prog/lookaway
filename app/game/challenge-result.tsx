import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { createChallenge } from '@/src/utils/challengeFlow';
import { spacing } from '@/src/theme/spacing';

interface ResultData {
  myScore: number;
  theirScore: number;
  myColor: string;
  theirColor: string;
  myUsername: string;
  theirUsername: string;
  friendId: string;
}

function Avatar({ initial, color, size = 56, winner = false }: { initial: string; color: string; size?: number; winner?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {winner && <Svg width={20} height={16} viewBox="0 0 24 24" style={{ marginBottom: 4 }}><Path d="M3,18 L5,8 L9,13 L12,5 L15,13 L19,8 L21,18 Z" fill="#D4A012" stroke="#D4A012" strokeWidth={1.5} strokeLinejoin="round" /></Svg>}
      <View style={[styles.avatar, { width: size, height: size, backgroundColor: color, borderColor: winner ? '#D4A012' : 'transparent', borderWidth: winner ? 2.5 : 0 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
      </View>
    </View>
  );
}

function ChallengeResultScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challengeId || !userId) return;
    let cancelled = false;

    async function load() {
      const { data: ch } = await supabase
        .from('friend_challenges')
        .select('challenger_id, challenged_id, challenger_score, challenged_score')
        .eq('id', challengeId)
        .single();

      if (!ch || cancelled) { setLoading(false); return; }

      const isChallenger = ch.challenger_id === userId;
      const friendId = isChallenger ? ch.challenged_id : ch.challenger_id;

      // Fetch both profiles
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_color').in('id', [userId, friendId]);
      if (cancelled) return;

      const myProfile = profiles?.find(p => p.id === userId);
      const theirProfile = profiles?.find(p => p.id === friendId);

      setData({
        myScore: isChallenger ? (ch.challenger_score ?? 0) : (ch.challenged_score ?? 0),
        theirScore: isChallenger ? (ch.challenged_score ?? 0) : (ch.challenger_score ?? 0),
        myColor: myProfile?.avatar_color ?? '#6C5CE7',
        theirColor: theirProfile?.avatar_color ?? '#0984E3',
        myUsername: myProfile?.username ?? 'you',
        theirUsername: theirProfile?.username ?? 'opponent',
        friendId,
      });
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [challengeId, userId]);

  const handleRematch = async () => {
    if (!userId || !data) return;
    const newId = await createChallenge(userId, data.friendId);
    if (newId) {
      router.replace({ pathname: '/game/challenge', params: { challengeId: newId, mode: 'create', friendId: data.friendId } });
    }
  };

  if (loading || !data) {
    return (<SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}><Text style={[styles.loadingText, { color: colors.textMid }]}>Loading result...</Text></SafeAreaView>);
  }

  const won = data.myScore > data.theirScore;
  const lost = data.theirScore > data.myScore;
  const tied = data.myScore === data.theirScore;
  const resultText = tied ? "It's a tie!" : won ? 'You won!' : 'They won!';
  const resultColor = tied ? colors.gold : won ? colors.correct : colors.wrong;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.accent }]}>Challenge Complete!</Text>

        {/* Avatars */}
        <View style={styles.avatarRow}>
          <View style={styles.playerCol}>
            <Avatar initial={data.myUsername[0]} color={data.myColor} winner={won} />
            <Text style={[styles.playerName, { color: colors.text }]}>You</Text>
          </View>
          <Text style={[styles.vsText, { color: colors.textLight }]}>VS</Text>
          <View style={styles.playerCol}>
            <Avatar initial={data.theirUsername[0]} color={data.theirColor} winner={lost} />
            <Text style={[styles.playerName, { color: colors.text }]}>@{data.theirUsername}</Text>
          </View>
        </View>

        {/* Scores */}
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { color: won ? colors.correct : colors.text }]}>{data.myScore}%</Text>
          <View style={{ width: 40 }} />
          <Text style={[styles.score, { color: lost ? colors.correct : colors.text }]}>{data.theirScore}%</Text>
        </View>

        {/* Result badge */}
        <View style={[styles.resultBadge, { backgroundColor: resultColor + '15' }]}>
          <Text style={[styles.resultText, { color: resultColor }]}>{won ? '\u{1F3C6} ' : ''}{resultText}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleRematch}>
            <Text style={styles.primaryBtnText}>Rematch</Text>
          </Pressable>
          <Pressable style={styles.secondaryLink} onPress={() => router.replace('/(tabs)/friends')}>
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
  title: { fontSize: 24, fontWeight: '800' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 8 },
  playerCol: { alignItems: 'center', gap: 8 },
  avatar: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  playerName: { fontSize: 14, fontWeight: '600' },
  vsText: { fontSize: 14, fontWeight: '700' },
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
