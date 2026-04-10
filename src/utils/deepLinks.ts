import { addFriendById } from '@/src/utils/friends';

const PENDING_INVITE_KEY = 'blanked_pending_invite';

/** Store a pending invite from a deep link */
export function storePendingInvite(inviterId: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PENDING_INVITE_KEY, inviterId);
    }
  } catch {}
}

/**
 * Process any pending invite after signup — auto-sends a friend request
 * from the inviter (the user who shared the link) TO the new user so that
 * when they open their friends tab they see the pending request waiting.
 *
 * Historically this duplicated the friendship existence check + insert
 * logic; now it just delegates to `addFriendById` so the pre-checks for
 * self / already-friends / pending are shared with the QR scanner flow.
 */
export async function processPendingInvite(myUserId: string): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;
    const inviterId = localStorage.getItem(PENDING_INVITE_KEY);
    if (!inviterId) return;
    // Argument order matters: inviter is the REQUESTER (they're the one
    // sending the request), new user is the addressee.
    await addFriendById(inviterId, myUserId);
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
