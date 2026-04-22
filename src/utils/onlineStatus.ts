/**
 * Online status helpers — three-tier system: online / recent / offline
 */
import { t } from '@/src/i18n';

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
  if (!lastActiveAt) return t('social.active_never');
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  if (minutes <= 2) return t('social.online_now');
  if (minutes < 60) return t('social.active_minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('social.active_hours', { hours });
  const days = Math.floor(hours / 24);
  return t('social.active_days', { days });
}

/** Color for each status tier */
export const STATUS_COLORS: Record<OnlineStatus, string> = {
  online: '#00B894',
  recent: '#D4A012',
  offline: '#B2BEC3',
};
