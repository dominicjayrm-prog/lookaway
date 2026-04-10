/**
 * friendsCache — tiny localStorage-backed cache for the friends tab.
 *
 * On first render of the friends tab the UI has no data because
 * `loadData()` (which hits Supabase) is still in-flight. That causes a
 * visible layout flash as the empty state renders briefly and then
 * collapses into the real content.
 *
 * This helper lets us persist the last fetched friends / requests /
 * challenges / recent-results blob per user and hydrate the tab from
 * it synchronously on mount. `loadData()` then refreshes in the
 * background without changing the layout (the arrays just get
 * updated with fresh data, no empty state flicker).
 */
import type { Friend, FriendRequest, Challenge } from '@/src/utils/friends';

export interface FriendsTabCache {
  friends: Friend[];
  requests: FriendRequest[];
  challenges: Challenge[];
  results: Challenge[];
  savedAt: number;
}

const DEFAULT_CACHE: FriendsTabCache = {
  friends: [],
  requests: [],
  challenges: [],
  results: [],
  savedAt: 0,
};

function key(userId: string): string {
  return `blanked-friends-cache-${userId}`;
}

/** Read the cached friends-tab data synchronously. Returns `DEFAULT_CACHE`
 *  if there's nothing saved or localStorage isn't available (native cold
 *  start, SSR, etc). Used as a `useState` initializer. */
export function readFriendsCache(userId: string | null | undefined): FriendsTabCache {
  if (!userId) return DEFAULT_CACHE;
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_CACHE;
    const raw = localStorage.getItem(key(userId));
    if (!raw) return DEFAULT_CACHE;
    const parsed = JSON.parse(raw) as Partial<FriendsTabCache>;
    return {
      friends: Array.isArray(parsed.friends) ? parsed.friends : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return DEFAULT_CACHE;
  }
}

/** Write the latest friends-tab data to localStorage. Fire and forget. */
export function writeFriendsCache(userId: string | null | undefined, data: Omit<FriendsTabCache, 'savedAt'>): void {
  if (!userId) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const payload: FriendsTabCache = { ...data, savedAt: Date.now() };
    localStorage.setItem(key(userId), JSON.stringify(payload));
  } catch {}
}
