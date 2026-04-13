/**
 * useFriendsBadgeCount — polls Supabase for the number of unseen items
 * the Friends tab wants to advertise on the bottom tab bar:
 *
 *  - Pending friend requests where the current user is the addressee
 *  - Incoming challenge invitations that haven't been played yet
 *     (friend_challenges where challenged_id = me AND status = 'pending')
 *
 * Returns the combined count. Re-polls every 30 seconds and whenever the
 * authed user id changes. Safe to call from multiple components — each
 * caller gets its own interval, but they all issue tiny `HEAD count`
 * queries so overhead is negligible.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

const POLL_INTERVAL_MS = 30_000;

async function fetchCount(userId: string): Promise<number> {
  try {
    const [{ count: reqCount }, { count: chCount }] = await Promise.all([
      supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('friend_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('challenged_id', userId)
        .eq('status', 'pending')
        .is('challenged_score', null),
    ]);
    return (reqCount ?? 0) + (chCount ?? 0);
  } catch {
    return 0;
  }
}

export function useFriendsBadgeCount(): number {
  const { user } = useAuth();
  const userId = user?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const next = await fetchCount(userId);
      if (!cancelled) setCount(next);
    };
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  return count;
}
