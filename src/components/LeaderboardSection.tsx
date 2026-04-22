/**
 * LeaderboardSection — Friends / Global toggle with ranked list and divisions.
 * Rendered on the Friends tab.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendAvatar } from '@/src/components/FriendAvatar';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  getMyGlobalRank,
  getDivision,
  getNextDivision,
  type LeaderboardEntry,
} from '@/src/utils/leaderboard';
import { log } from '@/src/lib/logger';

type Tab = 'friends' | 'global';

function LeaderboardSection() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [tab, setTab] = useState<Tab>('friends');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (tab === 'friends') {
        const data = await getFriendsLeaderboard(userId);
        setEntries(data);
        const myIdx = data.findIndex(e => e.id === userId);
        setMyRank(myIdx >= 0 ? myIdx + 1 : null);
      } else {
        const [data, rank] = await Promise.all([
          getGlobalLeaderboard(50),
          getMyGlobalRank(userId),
        ]);
        setEntries(data);
        setMyRank(rank);
      }
    } catch (e) {
      log.error('leaderboard', 'load failed', e);
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  useEffect(() => { load(); }, [load]);

  // Find my entry
  const myEntry = entries.find(e => e.id === userId);
  const myStars = myEntry?.total_stars ?? 0;
  const myDivision = getDivision(myStars);
  const nextDiv = getNextDivision(myStars);
  const starsToNext = nextDiv ? nextDiv.minStars - myStars : 0;

  return (
    <View style={[st.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={st.header}>
        <View style={[st.headerIconBg, { backgroundColor: colors.goldSoft }]}>
          <Ionicons name="podium-outline" size={15} color={colors.gold} />
        </View>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t('social.leaderboard')}</Text>
      </View>

      {/* Tab toggle */}
      <View style={[st.tabRow, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[st.tabBtn, tab === 'friends' && [st.tabActive, { backgroundColor: colors.card }]]}
          onPress={() => setTab('friends')}
        >
          <Text style={[st.tabText, { color: tab === 'friends' ? colors.accent : colors.textMid }]}>{t('social.friends_tab')}</Text>
        </Pressable>
        <Pressable
          style={[st.tabBtn, tab === 'global' && [st.tabActive, { backgroundColor: colors.card }]]}
          onPress={() => setTab('global')}
        >
          <Text style={[st.tabText, { color: tab === 'global' ? colors.accent : colors.textMid }]}>{t('social.global_tab')}</Text>
        </Pressable>
      </View>

      {/* Division badge for current user */}
      {myEntry && (
        <View style={[st.divisionRow, { backgroundColor: myDivision.color + '10', borderColor: myDivision.color + '25' }]}>
          <Text style={st.divisionIcon}>{myDivision.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.divisionName, { color: myDivision.color }]}>{t('social.division_label', { name: myDivision.name })}</Text>
            {nextDiv ? (
              <Text style={[st.divisionSub, { color: colors.textMid }]}>
                {t('social.stars_to_next', { count: starsToNext, name: nextDiv.name })}
              </Text>
            ) : (
              <Text style={[st.divisionSub, { color: colors.textMid }]}>{t('social.top_division')}</Text>
            )}
          </View>
          {myRank && (
            <View style={[st.rankBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[st.rankText, { color: colors.accent }]}>#{myRank}</Text>
            </View>
          )}
        </View>
      )}

      {/* Loading */}
      {loading && entries.length === 0 && (
        <View style={st.loadingBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <View style={st.emptyBox}>
          <Text style={[st.emptyText, { color: colors.textLight }]}>
            {tab === 'friends' ? t('social.add_friends_hint') : t('social.no_players_yet')}
          </Text>
        </View>
      )}

      {/* Leaderboard list */}
      {entries.slice(0, 20).map((entry, i) => (
        <LeaderboardRow
          key={entry.id}
          entry={entry}
          isMe={entry.id === userId}
          colors={colors}
          isLast={i === Math.min(entries.length, 20) - 1}
        />
      ))}

      {/* My position if not in visible list */}
      {myEntry && entries.indexOf(myEntry) >= 20 && (
        <>
          <View style={[st.separator, { borderColor: colors.border }]}>
            <Text style={[st.separatorText, { color: colors.textLight }]}>...</Text>
          </View>
          <LeaderboardRow entry={myEntry} isMe colors={colors} isLast />
        </>
      )}
    </View>
  );
}

// Avatar rendering has been unified through `FriendAvatar` so the
// leaderboard row matches the rest of the social surfaces: uploaded
// photo OR Blink mascot, always inside the player's equipped frame,
// wearing their equipped expression. Previously this component
// hardcoded `<Blink expression="normal" />` which is why every
// friend + global-leaderboard row looked identical regardless of
// that player's cosmetics.

function RankDisplay({ rank, colors }: { rank: number; colors: Record<string, string> }) {
  if (rank === 1) return <Text style={st.medalText}>{'\u{1F947}'}</Text>;
  if (rank === 2) return <Text style={st.medalText}>{'\u{1F948}'}</Text>;
  if (rank === 3) return <Text style={st.medalText}>{'\u{1F949}'}</Text>;
  return <Text style={[st.rankNum, { color: colors.textMid }]}>{rank}</Text>;
}

interface RowProps {
  entry: LeaderboardEntry;
  isMe: boolean;
  colors: Record<string, string>;
  isLast: boolean;
}

function LeaderboardRow({ entry, isMe, colors, isLast }: RowProps) {
  return (
    <View style={[
      st.row,
      isMe && { backgroundColor: colors.accentSoft },
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
      <View style={st.rankCol}>
        <RankDisplay rank={entry.rank} colors={colors} />
      </View>
      <FriendAvatar
        username={entry.username}
        avatarColor={entry.avatar_color}
        avatarUrl={entry.avatar_url}
        equippedFrame={entry.equipped_frame}
        equippedExpression={entry.equipped_expression}
        size={30}
        showDefaultRing
      />
      <View style={st.nameCol}>
        <Text style={[st.username, { color: colors.text }, isMe && { fontWeight: '800' }]} numberOfLines={1}>
          {isMe ? t('social.you') : `@${entry.username}`}
        </Text>
        <Text style={[st.divisionLabel, { color: entry.division.color }]}>
          {entry.division.icon} {entry.division.name}
        </Text>
      </View>
      <View style={st.starsCol}>
        <Text style={[st.starsValue, { color: colors.gold }]}>{entry.total_stars}</Text>
        <Text style={[st.starsLabel, { color: colors.textLight }]}>{t('social.stars_suffix')}</Text>
      </View>
    </View>
  );
}

export default LeaderboardSection;

const st = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerIconBg: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '700' },

  divisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  divisionIcon: { fontSize: 22 },
  divisionName: { fontSize: 13, fontWeight: '700' },
  divisionSub: { fontSize: 11, marginTop: 1 },
  rankBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  rankText: { fontSize: 13, fontWeight: '800' },

  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  rankCol: { width: 28, alignItems: 'center' },
  medalText: { fontSize: 18 },
  rankNum: { fontSize: 13, fontWeight: '700' },
  nameCol: { flex: 1 },
  username: { fontSize: 13, fontWeight: '600' },
  divisionLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  starsCol: { alignItems: 'flex-end' },
  starsValue: { fontSize: 14, fontWeight: '800' },
  starsLabel: { fontSize: 9, fontWeight: '600' },

  separator: { alignItems: 'center', paddingVertical: 4, borderTopWidth: 1 },
  separatorText: { fontSize: 11 },
});
