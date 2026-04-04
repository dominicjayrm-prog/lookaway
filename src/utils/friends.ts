import { supabase } from '@/src/lib/supabase';
import { notifyFriendRequest } from '@/src/utils/notifications';
import { checkAchievements } from '@/src/utils/achievements';

// ─── Types ───────────────────────────────────────────────────────────

export interface FriendProfile {
  id: string;
  username: string;
  avatar_color: string;
  total_stars: number;
  highest_world: number;
  last_seen: string | null;
}

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

// ─── User search ─────────────────────────────────────────────────────

export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<FriendProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_color, total_stars, highest_world, last_seen')
    .ilike('username', `${query}%`)
    .neq('id', currentUserId)
    .limit(5);

  if (error) {
    console.warn('searchUsers error:', error.message);
    return [];
  }
  return (data ?? []) as FriendProfile[];
}

// ─── Friend requests ─────────────────────────────────────────────────

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });

  if (error) {
    console.warn('sendFriendRequest error:', error.message);
    return false;
  }

  // Notify the addressee
  const { data: requesterProfile } = await supabase.from('profiles').select('username').eq('id', requesterId).single();
  if (requesterProfile?.username) {
    notifyFriendRequest(addresseeId, requesterProfile.username);
  }

  return true;
}

export async function acceptFriendRequest(friendshipId: string, myUserId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);

  if (error) {
    console.warn('acceptFriendRequest error:', error.message);
    return false;
  }

  // Check popular achievement for both users
  if (myUserId) {
    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`);
    checkAchievements(myUserId, { type: 'friend_added', data: { totalFriends: count ?? 0 } }).catch(() => {});
  }

  return true;
}

export async function declineFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.warn('declineFriendRequest error:', error.message);
    return false;
  }
  return true;
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.warn('removeFriend error:', error.message);
    return false;
  }
  return true;
}

// ─── Friend lists ────────────────────────────────────────────────────

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, created_at, requester:profiles!friendships_requester_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen)')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getFriendRequests error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    requester: row.requester as FriendProfile,
    created_at: row.created_at as string,
  }));
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen),
      addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen)
    `)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.warn('getFriends error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const isRequester = row.requester_id === userId;
    const otherProfile = isRequester ? row.addressee : row.requester;
    return {
      friendshipId: row.id as string,
      profile: otherProfile as FriendProfile,
    };
  });
}

// ─── Challenges ──────────────────────────────────────────────────────

export async function getActiveChallenges(userId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('friend_challenges')
    .select(`
      id, challenger_id, challenged_id, level_ids, challenger_score, challenged_score, status, created_at, mode,
      challenger:profiles!friend_challenges_challenger_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen),
      challenged:profiles!friend_challenges_challenged_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen)
    `)
    .eq('status', 'pending')
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getActiveChallenges error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const iAmChallenger = row.challenger_id === userId;
    return {
      id: row.id as string,
      challenger_id: row.challenger_id as string,
      challenged_id: row.challenged_id as string,
      opponent: (iAmChallenger ? row.challenged : row.challenger) as FriendProfile,
      level_ids: row.level_ids as string[],
      my_score: (iAmChallenger ? row.challenger_score : row.challenged_score) as number | null,
      their_score: (iAmChallenger ? row.challenged_score : row.challenger_score) as number | null,
      status: row.status as string,
      created_at: row.created_at as string,
      mode: (row.mode as string) ?? 'classic',
    };
  });
}

export async function getRecentResults(
  userId: string,
  limit: number,
): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('friend_challenges')
    .select(`
      id, challenger_id, challenged_id, level_ids, challenger_score, challenged_score, status, created_at, mode,
      challenger:profiles!friend_challenges_challenger_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen),
      challenged:profiles!friend_challenges_challenged_id_fkey(id, username, avatar_color, total_stars, highest_world, last_seen)
    `)
    .eq('status', 'completed')
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('getRecentResults error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const iAmChallenger = row.challenger_id === userId;
    return {
      id: row.id as string,
      challenger_id: row.challenger_id as string,
      challenged_id: row.challenged_id as string,
      opponent: (iAmChallenger ? row.challenged : row.challenger) as FriendProfile,
      level_ids: row.level_ids as string[],
      my_score: (iAmChallenger ? row.challenger_score : row.challenged_score) as number | null,
      their_score: (iAmChallenger ? row.challenged_score : row.challenger_score) as number | null,
      status: row.status as string,
      created_at: row.created_at as string,
      mode: (row.mode as string) ?? 'classic',
    };
  });
}

// ─── Head-to-head record ────────────────────────────────────────────

export async function getHeadToHeadRecord(
  myId: string,
  friendId: string,
): Promise<{ wins: number; losses: number; draws: number }> {
  const { data, error } = await supabase
    .from('friend_challenges')
    .select('challenger_id, challenged_id, challenger_score, challenged_score')
    .eq('status', 'completed')
    .or(
      `and(challenger_id.eq.${myId},challenged_id.eq.${friendId}),and(challenger_id.eq.${friendId},challenged_id.eq.${myId})`,
    );

  if (error) {
    console.warn('getHeadToHeadRecord error:', error.message);
    return { wins: 0, losses: 0, draws: 0 };
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const row of data ?? []) {
    const iAmChallenger = row.challenger_id === myId;
    const myScore = iAmChallenger ? row.challenger_score : row.challenged_score;
    const theirScore = iAmChallenger ? row.challenged_score : row.challenger_score;

    if (myScore == null || theirScore == null) continue;
    if (myScore > theirScore) wins++;
    else if (myScore < theirScore) losses++;
    else draws++;
  }

  return { wins, losses, draws };
}

// ─── Online status ──────────────────────────────────────────────────

export async function updateOnlineStatus(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.warn('updateOnlineStatus error:', error.message);
    return false;
  }
  return true;
}
