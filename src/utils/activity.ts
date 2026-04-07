import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActivityEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY = 'blanked_activity';
const MAX_EVENTS = 20;

/** Log an activity event. Fire-and-forget — never blocks gameplay. */
export function logActivity(type: string, data: Record<string, unknown>): void {
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const events: ActivityEvent[] = raw ? JSON.parse(raw) : [];
      events.unshift({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
      });
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {}
  })();
}

/** Get recent activity events. */
export async function getRecentActivity(limit: number = 3): Promise<ActivityEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const events: ActivityEvent[] = JSON.parse(raw);
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
