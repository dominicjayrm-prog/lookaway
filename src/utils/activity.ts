export interface ActivityEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// NOTE: Uses localStorage (sync) for performance. Works on web; on native iOS
// localStorage is unavailable so activity is silently not persisted.
// TODO: migrate to AsyncStorage when native build is ready.
const STORAGE_KEY = 'blanked_activity';
const MAX_EVENTS = 20;

export function logActivity(type: string, data: Record<string, unknown>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const events: ActivityEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    events.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {}
}

export function getRecentActivity(limit: number = 3): ActivityEvent[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const events: ActivityEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return events.slice(0, limit);
  } catch { return []; }
}

export function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
