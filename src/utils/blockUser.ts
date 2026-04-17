/**
 * blockUser — directed-edge user block.
 *
 * Apple guideline 1.2 requires any app with user-to-user interaction
 * to let players block other users (in addition to the existing
 * report flow). "Remove friend" isn't enough — a removed friend can
 * still send new friend requests and appear in search.
 *
 * Block semantics:
 *   - A → B block: A never sees B in search, friend requests,
 *     leaderboards; B cannot send A a new friend request or challenge.
 *   - Filtering is SYMMETRIC in friends.ts — if either side has
 *     blocked the other, the row is filtered out.
 *   - Blocking auto-cancels any existing friendship and any pending
 *     request between the two (handled in `blockUser()` below).
 *
 * RLS on `blocked_users` (see sql/blocked_users_setup.sql):
 *   - SELECT: visible to blocker AND blocked (needed for symmetric
 *     filtering client-side).
 *   - INSERT/DELETE: blocker_id = auth.uid() only.
 */
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

export interface BlockedUser {
  id: string;
  username: string;
  avatar_color: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Block a user. Also deletes any existing friendship or pending
 * request in either direction — a single round-trip per cleanup, run
 * in parallel with the INSERT so worst case is ~one network RTT.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;

  const [{ error: insertErr }] = await Promise.all([
    supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId }),
    // Wipe any friendship or pending request between the two. RLS on
    // friendships allows delete when the caller is either party, so
    // this works regardless of who sent the original request.
    supabase
      .from('friendships')
      .delete()
      .or(
        `and(requester_id.eq.${blockerId},addressee_id.eq.${blockedId}),and(requester_id.eq.${blockedId},addressee_id.eq.${blockerId})`,
      ),
  ]);

  // `unique_violation` = already blocked. Treat as success — the
  // UX is idempotent ("tap Block twice" shouldn't surface an error).
  if (insertErr && (insertErr as { code?: string }).code !== '23505') {
    log.supabaseError('blockUser', 'insert block', insertErr, { blockerId, blockedId });
    return false;
  }
  return true;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  if (!blockerId || !blockedId) return false;
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (log.supabaseError('blockUser', 'unblock', error, { blockerId, blockedId })) return false;
  return true;
}

/**
 * List every user the current player has blocked. Used by the
 * Blocked users screen in Profile.
 */
export async function listBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('created_at, blocked:profiles!blocked_users_blocked_id_fkey(id, username, avatar_color, avatar_url)')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (log.supabaseError('blockUser', 'list', error, { blockerId })) return [];
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const p = row.blocked as { id: string; username: string; avatar_color: string | null; avatar_url: string | null } | null;
      if (!p || !p.username) return null;
      return {
        id: p.id,
        username: p.username,
        avatar_color: p.avatar_color,
        avatar_url: p.avatar_url,
        created_at: row.created_at as string,
      };
    })
    .filter((b): b is BlockedUser => b !== null);
}

/**
 * Return the set of user IDs hidden from `userId` — union of:
 *   - users THEY blocked
 *   - users who blocked THEM
 *
 * Cached per call-site; callers should pass this set to filter
 * search results, leaderboard entries, incoming challenge invites,
 * and friend request lists.
 */
export async function getHiddenUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (log.supabaseError('blockUser', 'getHiddenUserIds', error, { userId })) return new Set();
  const hidden = new Set<string>();
  for (const row of data ?? []) {
    const other = row.blocker_id === userId ? row.blocked_id : row.blocker_id;
    if (other) hidden.add(other as string);
  }
  return hidden;
}

/**
 * Cheap pairwise check used by the friend profile popup to decide
 * whether to show "Block" or "Unblock". Two rows max.
 */
export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
