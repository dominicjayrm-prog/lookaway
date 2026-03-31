import { supabase } from '@/src/lib/supabase';

const PENDING_INVITE_KEY = 'lookaway_pending_invite';

/** Store a pending invite from a deep link */
export function storePendingInvite(inviterId: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PENDING_INVITE_KEY, inviterId);
    }
  } catch {}
}

/** Process any pending invite after signup — auto-sends friend request */
export async function processPendingInvite(myUserId: string): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;
    const inviterId = localStorage.getItem(PENDING_INVITE_KEY);
    if (!inviterId || inviterId === myUserId) return;

    // Check not already friends
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${inviterId},addressee_id.eq.${myUserId}),and(requester_id.eq.${myUserId},addressee_id.eq.${inviterId})`)
      .limit(1);

    if (existing && existing.length > 0) {
      localStorage.removeItem(PENDING_INVITE_KEY);
      return;
    }

    // Send friend request from inviter to new user
    await supabase.from('friendships').insert({
      requester_id: inviterId,
      addressee_id: myUserId,
      status: 'pending',
    });

    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch (e) {
    console.warn('Process pending invite failed:', e);
  }
}

/** Parse a URL and extract invite ID if present */
export function parseInviteUrl(url: string): string | null {
  const match = url.match(/invite\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}
