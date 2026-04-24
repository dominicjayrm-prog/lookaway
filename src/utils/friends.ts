import { supabase } from '@/src/lib/supabase';
import { notifyFriendRequest } from '@/src/utils/notifications';
import { checkAchievements } from '@/src/utils/achievements';
import { notifyFriendRequestAccepted } from '@/src/utils/notifications';
import { getHiddenUserIds } from '@/src/utils/blockUser';
import { log } from '@/src/lib/logger';

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface FriendProfile {
  id: string;
  username: string;
  avatar_color: string;
  total_stars: number;
  /** @deprecated Display the unified_position instead — post-journey
   *  rollout we show "Level 108" not "World 3". Kept in the type so
   *  older cloud rows that haven't been re-synced continue to parse. */
  highest_world: number;
  /** 1-380 on the Unified Brain Journey. This is the display value on
   *  friend cards, leaderboard rows, and the friend profile popup. */
  unified_position: number;
  last_seen: string | null;
  avatar_url?: string | null;
  equipped_frame?: string | null;
  equipped_expression?: string | null;
  equipped_banner?: string | null;
  equipped_name_color?: string | null;
  memory_score_avg?: number | null;
}

/** Columns we need from public.profiles everywhere a FriendProfile is
 *  hydrated — keep in sync with the FriendProfile interface above. */
export const FRIEND_PROFILE_COLUMNS =
  'id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg';

export interface FriendRequest {
  id: string;
  requester: FriendProfile;
  created_at: string;
}

export interface Friend {
  friendshipId: string;
  profile: FriendProfile;
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  opponent: FriendProfile;
  level_ids: string[];
  my_score: number | null;
  their_score: number | null;
  status: string;
  created_at: string;
  mode: string;
}

// \u2500\u2500\u2500 User search \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function searchUsers(query: string, currentUserId: string): Promise<FriendProfile[]> {
  // Fetch blocks in parallel with the search — blocks list is
  // normally very small so the round-trip is cheap. We request 5+
  // extra rows to compensate for the ones we'll filter out.
  const [searchRes, hidden] = await Promise.all([
    supabase
      .from('profiles')
      .select(FRIEND_PROFILE_COLUMNS)
      .ilike('username', `${query}%`)
      .neq('id', currentUserId)
      .limit(15),
    getHiddenUserIds(currentUserId),
  ]);
  const { data, error } = searchRes;
  if (log.supabaseError('friends', 'searchUsers', error, { query })) return [];
  const rows = (data ?? []) as FriendProfile[];
  return rows.filter((r) => !hidden.has(r.id)).slice(0, 5);
}

// \u2500\u2500\u2500 Friend requests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<boolean> {
  const { error } = await supabase.from('friendships').insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
  if (log.supabaseError('friends', 'sendFriendRequest', error, { requesterId, addresseeId })) return false;
  const { data: requesterProfile } = await supabase.from('profiles').select('username').eq('id', requesterId).single();
  if (requesterProfile?.username) { notifyFriendRequest(addresseeId, requesterProfile.username); }
  return true;
}

/**
 * Result of a one-shot "add this user by ID" attempt. Used by the QR
 * scanner and the deep-link invite handler so both flows surface the same
 * set of states to the user.
 */
export type AddFriendResult =
  | 'sent'              // Friend request was just inserted
  | 'already_friends'   // Pair already has an accepted friendship
  | 'request_pending'   // A pending request already exists (either direction)
  | 'self'              // Target is the current user
  | 'error';            // Network / RLS / unknown failure

/**
 * High-level "add this user as a friend" that consolidates the
 * pre-checks (self, already friends, pending) and the INSERT.
 *
 * Before this existed, `processPendingInvite()` in `deepLinks.ts` and the
 * various paywall/search flows all open-coded this logic. Any new flow
 * (QR scan, NFC, etc.) should use this helper instead of talking to
 * `supabase.from('friendships')` directly.
 */
export async function addFriendById(myId: string, targetId: string): Promise<AddFriendResult> {
  if (!myId || !targetId) return 'error';
  if (myId === targetId) return 'self';
  try {
    // Refuse the request if either party has blocked the other.
    // The DB-level guard is RLS (an insert from a blocked user will
    // succeed since we don't RLS-gate friendships by block state —
    // we enforce this purely client-side, which is fine because a
    // blocked user has no UI path to type this code anyway; this
    // guard just protects against deep-link / QR-scan edge cases).
    const hidden = await getHiddenUserIds(myId);
    if (hidden.has(targetId)) return 'error';
    const { data: existing, error: existingError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${myId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${myId})`)
      .limit(1);
    if (log.supabaseError('friends', 'addFriendById.check', existingError, { myId, targetId })) return 'error';
    if (existing && existing.length > 0) {
      const row = existing[0] as { status: string };
      if (row.status === 'accepted') return 'already_friends';
      return 'request_pending';
    }
    const ok = await sendFriendRequest(myId, targetId);
    return ok ? 'sent' : 'error';
  } catch (e) {
    log.error('friends', 'addFriendById threw', e, { myId, targetId });
    return 'error';
  }
}

export async function acceptFriendRequest(friendshipId: string, myUserId?: string): Promise<boolean> {
  // Fetch the request row BEFORE updating so we can figure out who
  // the original sender is and push a "request accepted" notification
  // back to them. Small extra query, but only fires on accept so the
  // overhead is negligible.
  const { data: row } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('id', friendshipId)
    .single();

  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  if (log.supabaseError('friends', 'acceptFriendRequest', error, { friendshipId })) return false;
  if (myUserId) {
    const { count } = await supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`);
    checkAchievements(myUserId, { type: 'friend_added', data: { totalFriends: count ?? 0 } }).catch(() => {});

    // Ping the original requester. We only push to them if they're
    // NOT the one accepting (me accepting my own pending outgoing
    // request shouldn't fire a self-notification).
    if (row?.requester_id && row.requester_id !== myUserId) {
      const { data: me } = await supabase.from('profiles').select('username').eq('id', myUserId).single();
      if (me?.username) {
        notifyFriendRequestAccepted(row.requester_id, me.username).catch(() => {});
      }
    }
  }
  return true;
}

export async function declineFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (log.supabaseError('friends', 'declineFriendRequest', error, { friendshipId })) return false;
  return true;
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (log.supabaseError('friends', 'removeFriend', error, { friendshipId })) return false;
  return true;
}

// \u2500\u2500\u2500 Friend lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  const [reqRes, hidden] = await Promise.all([
    supabase.from('friendships').select('id, created_at, requester:profiles!friendships_requester_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg)').eq('addressee_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
    getHiddenUserIds(userId),
  ]);
  const { data, error } = reqRes;
  if (log.supabaseError('friends', 'getFriendRequests', error, { userId })) return [];
  // Same defensive filter as getFriends / getRecentResults: skip
  // rows where the requester profile failed to join. Also drop any
  // requester the current user has blocked (or who has blocked them).
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const requester = row.requester as FriendProfile | null | undefined;
      if (!requester || typeof requester !== 'object' || !(requester as FriendProfile).username) return null;
      if (hidden.has((requester as FriendProfile).id)) return null;
      return { id: row.id as string, requester: requester as FriendProfile, created_at: row.created_at as string };
    })
    .filter((r): r is FriendRequest => r !== null);
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const [friendsRes, hidden] = await Promise.all([
    supabase.from('friendships').select('id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg), addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg)').eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    getHiddenUserIds(userId),
  ]);
  const { data, error } = friendsRes;
  if (log.supabaseError('friends', 'getFriends', error, { userId })) return [];
  // Filter out rows whose other-side profile FK returned null
  // (deleted account, RLS edge, or mid-cleanup row) AND rows where
  // the other party is blocked in either direction. Without the
  // null guard the FriendsListSection crashes on `profile.username`
  // and bubbles up to the root error boundary.
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const isRequester = row.requester_id === userId;
      const profile = (isRequester ? row.addressee : row.requester) as FriendProfile | null | undefined;
      if (!profile || typeof profile !== 'object' || !(profile as FriendProfile).username) return null;
      if (hidden.has((profile as FriendProfile).id)) return null;
      return { friendshipId: row.id as string, profile: profile as FriendProfile };
    })
    .filter((f): f is Friend => f !== null);
}

// \u2500\u2500\u2500 Challenges \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/**
 * Shared row → Challenge mapper. Historically this logic was inlined
 * inside both getActiveChallenges and getRecentResults, and if the
 * profile FK join returned null (deleted profile, RLS edge, or a
 * row mid-cleanup) the downstream `c.opponent.username` read in
 * ActiveChallengesSection / RecentResultsSection threw at render
 * time — which is what was tripping the root error boundary when
 * the user tapped "Back to friends" after a challenge. Filtering
 * those broken rows out here is a single fix point that protects
 * every consumer.
 */
function mapChallengeRow(row: Record<string, unknown>, userId: string): Challenge | null {
  const iAmChallenger = row.challenger_id === userId;
  const opponent = (iAmChallenger ? row.challenged : row.challenger) as FriendProfile | null | undefined;
  if (!opponent || typeof opponent !== 'object' || !(opponent as FriendProfile).username) {
    return null;
  }
  return {
    id: row.id as string,
    challenger_id: row.challenger_id as string,
    challenged_id: row.challenged_id as string,
    opponent: opponent as FriendProfile,
    level_ids: row.level_ids as string[],
    my_score: (iAmChallenger ? row.challenger_score : row.challenged_score) as number | null,
    their_score: (iAmChallenger ? row.challenged_score : row.challenger_score) as number | null,
    status: row.status as string,
    created_at: row.created_at as string,
    mode: (row.mode as string) ?? 'classic',
  };
}

export async function getActiveChallenges(userId: string): Promise<Challenge[]> {
  const { data, error } = await supabase.from('friend_challenges').select('id, challenger_id, challenged_id, level_ids, challenger_score, challenged_score, status, created_at, mode, challenger:profiles!friend_challenges_challenger_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg), challenged:profiles!friend_challenges_challenged_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg)').eq('status', 'pending').or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`).order('created_at', { ascending: false });
  if (log.supabaseError('friends', 'getActiveChallenges', error, { userId })) return [];
  return (data ?? [])
    .map((row: Record<string, unknown>) => mapChallengeRow(row, userId))
    .filter((c): c is Challenge => c !== null);
}

export async function getRecentResults(userId: string, limit: number): Promise<Challenge[]> {
  const { data, error } = await supabase.from('friend_challenges').select('id, challenger_id, challenged_id, level_ids, challenger_score, challenged_score, status, created_at, mode, challenger:profiles!friend_challenges_challenger_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg), challenged:profiles!friend_challenges_challenged_id_fkey(id, username, avatar_color, total_stars, highest_world, unified_position, last_seen, avatar_url, equipped_frame, equipped_expression, equipped_banner, equipped_name_color, memory_score_avg)').eq('status', 'completed').or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`).order('created_at', { ascending: false }).limit(limit);
  if (log.supabaseError('friends', 'getRecentResults', error, { userId, limit })) return [];
  return (data ?? [])
    .map((row: Record<string, unknown>) => mapChallengeRow(row, userId))
    .filter((c): c is Challenge => c !== null);
}

// \u2500\u2500\u2500 Head-to-head record \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function getHeadToHeadRecord(myId: string, friendId: string): Promise<{ wins: number; losses: number; draws: number }> {
  const { data, error } = await supabase.from('friend_challenges').select('challenger_id, challenged_id, challenger_score, challenged_score').eq('status', 'completed').or(`and(challenger_id.eq.${myId},challenged_id.eq.${friendId}),and(challenger_id.eq.${friendId},challenged_id.eq.${myId})`);
  if (log.supabaseError('friends', 'getHeadToHeadRecord', error, { myId, friendId })) return { wins: 0, losses: 0, draws: 0 };
  let wins = 0, losses = 0, draws = 0;
  for (const row of data ?? []) {
    const iAmChallenger = row.challenger_id === myId;
    const myScore = iAmChallenger ? row.challenger_score : row.challenged_score;
    const theirScore = iAmChallenger ? row.challenged_score : row.challenger_score;
    if (myScore == null || theirScore == null) continue;
    if (myScore > theirScore) wins++; else if (myScore < theirScore) losses++; else draws++;
  }
  return { wins, losses, draws };
}

// \u2500\u2500\u2500 Online status \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function updateOnlineStatus(userId: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  if (log.supabaseError('friends', 'updateOnlineStatus', error, { userId })) return false;
  return true;
}
