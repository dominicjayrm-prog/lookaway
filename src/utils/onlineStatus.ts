/**
 * Online status helpers — three-tier system: online / recent / offline
 */

export type OnlineStatus = 'online' | 'recent' | 'offline';

/** Determine status from last_active_at / last_seen timestamp */
export function getOnlineStatus(lastActiveAt: string | null): OnlineStatus {
  if (!lastActiveAt) return 'offline';
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const minutes = diff / 1000 / 60;
  if (minutes <= 2) return 'online';
  if (minutes <= 15) return 'recent';
  return 'offline';
}

/** Human-readable last active text */
export function getLastActiveText(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Never';
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  if (minutes <= 2) return 'Online now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days}d ago`;
}

/** Color for each status tier */
export const STATUS_COLORS: Record<OnlineStatus, string> = {
  online: '#00B894',
  recent: '#D4A012',
  offline: '#B2BEC3',
};
