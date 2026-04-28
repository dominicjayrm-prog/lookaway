/**
 * Seasonal Events system — time-limited events with themed levels,
 * bonus rewards, and special cosmetics.
 *
 * Events are defined in code (not fetched from server) so they work offline.
 * Events rotate monthly or for special occasions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Event definitions ─────────────────────────────────────────────────
export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: 'themed_levels' | 'double_gems' | 'bonus_stars' | 'special_mode';
  rewards: EventReward[];
  levels?: EventLevel[]; // For themed_levels type
  gemMultiplier?: number; // For double_gems type (default 2)
  starMultiplier?: number; // For bonus_stars type
}

export interface EventReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'gems' | 'powerup' | 'cosmetic' | 'badge';
  amount: number;
  threshold: number; // e.g. complete 3 event levels to unlock
  cosmetic?: string; // cosmetic ID if type is 'cosmetic'
}

export interface EventLevel {
  id: string;
  title: string;
  difficulty: number; // 1-10
  levelData: Record<string, unknown>; // same format as campaign levels
}

// ── Progress tracking ─────────────────────────────────────────────────
export interface EventProgress {
  eventId: string;
  levelsCompleted: number;
  gemsEarned: number;
  claimedRewards: string[]; // reward IDs
  lastPlayedAt: string | null;
}

const STORAGE_KEY = 'blanked_event_progress';

async function loadProgress(): Promise<Record<string, EventProgress>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

async function saveProgress(progress: Record<string, EventProgress>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ── 2026 Event Calendar ───────────────────────────────────────────────
// Events are hardcoded per month — deterministic for all players.

const EVENTS_2026: SeasonalEvent[] = [
  // ── APRIL 2026 ──
  {
    id: 'spring_memory_2026',
    name: 'Spring Memory',
    description: 'Fresh shapes, fresh colours. Celebrate the season!',
    icon: 'flower-outline',
    color: '#00B894',
    startDate: '2026-04-01',
    endDate: '2026-04-14',
    type: 'themed_levels',
    rewards: [
      { id: 'spring_gems_1', name: '25 gems', description: 'Complete 2 spring levels', icon: 'diamond', type: 'gems', amount: 25, threshold: 2 },
      { id: 'spring_gems_2', name: '50 gems', description: 'Complete 5 spring levels', icon: 'diamond', type: 'gems', amount: 50, threshold: 5 },
      { id: 'spring_badge', name: 'Spring Bloom badge', description: 'Complete all 8 levels', icon: 'ribbon', type: 'badge', amount: 1, threshold: 8 },
    ],
    levels: [
      { id: 'spring_1', title: 'First Buds', difficulty: 2, levelData: { shapeCount: 4, viewingTime: 5, colorPool: ['#00B894', '#FD79A8', '#F9CA24'], shapePool: ['circle', 'heart', 'star'] } },
      { id: 'spring_2', title: 'Morning Dew', difficulty: 3, levelData: { shapeCount: 5, viewingTime: 4.5, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#0984E3'], shapePool: ['circle', 'heart', 'star', 'diamond'] } },
      { id: 'spring_3', title: 'Petal Pattern', difficulty: 3, levelData: { shapeCount: 5, viewingTime: 4, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#0984E3'], shapePool: ['circle', 'heart', 'triangle', 'diamond'] } },
      { id: 'spring_4', title: 'Garden Path', difficulty: 4, levelData: { shapeCount: 6, viewingTime: 4, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#6C5CE7'], shapePool: ['circle', 'heart', 'star', 'diamond', 'hexagon'] } },
      { id: 'spring_5', title: 'Blossom Burst', difficulty: 5, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#0984E3', '#6C5CE7'], shapePool: ['circle', 'heart', 'star', 'diamond', 'hexagon'] } },
      { id: 'spring_6', title: 'Butterfly Garden', difficulty: 5, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#E17055'], shapePool: ['circle', 'heart', 'star', 'triangle', 'hexagon'] } },
      { id: 'spring_7', title: 'Full Bloom', difficulty: 6, levelData: { shapeCount: 8, viewingTime: 3, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#0984E3', '#6C5CE7'], shapePool: ['circle', 'heart', 'star', 'diamond', 'hexagon', 'triangle'] } },
      { id: 'spring_8', title: 'Spring Finale', difficulty: 7, levelData: { shapeCount: 9, viewingTime: 3, colorPool: ['#00B894', '#FD79A8', '#F9CA24', '#0984E3', '#6C5CE7', '#E17055'], shapePool: ['circle', 'heart', 'star', 'diamond', 'hexagon', 'triangle'] } },
    ],
  },

  // ── DOUBLE GEM WEEKENDS ──
  {
    id: 'double_gems_apr_2026',
    name: 'Double Gem Weekend',
    description: 'All gem rewards doubled this weekend!',
    icon: 'diamond',
    color: '#6C5CE7',
    startDate: '2026-04-18',
    endDate: '2026-04-20',
    type: 'double_gems',
    gemMultiplier: 2,
    rewards: [
      { id: 'dg_apr_1', name: '30 bonus gems', description: 'Complete 3 levels this weekend', icon: 'diamond', type: 'gems', amount: 30, threshold: 3 },
      { id: 'dg_apr_2', name: '75 bonus gems', description: 'Complete 8 levels this weekend', icon: 'diamond', type: 'gems', amount: 75, threshold: 8 },
    ],
  },

  // ── MAY 2026 ──
  {
    id: 'brain_boost_may_2026',
    name: 'Brain Boost Month',
    description: 'Mental health awareness month. Train your memory!',
    icon: 'fitness-outline',
    color: '#0984E3',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    type: 'themed_levels',
    rewards: [
      { id: 'brain_gems_1', name: '30 gems', description: 'Complete 3 brain boost levels', icon: 'diamond', type: 'gems', amount: 30, threshold: 3 },
      { id: 'brain_gems_2', name: '75 gems', description: 'Complete 7 levels', icon: 'diamond', type: 'gems', amount: 75, threshold: 7 },
      { id: 'brain_badge', name: 'Brain Boost badge', description: 'Complete all 10 levels', icon: 'ribbon', type: 'badge', amount: 1, threshold: 10 },
    ],
    levels: [
      { id: 'brain_1', title: 'Warm Up', difficulty: 2, levelData: { shapeCount: 4, viewingTime: 5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7'], shapePool: ['circle', 'square', 'triangle'] } },
      { id: 'brain_2', title: 'Focus', difficulty: 3, levelData: { shapeCount: 5, viewingTime: 4.5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894'], shapePool: ['circle', 'square', 'diamond'] } },
      { id: 'brain_3', title: 'Concentration', difficulty: 3, levelData: { shapeCount: 5, viewingTime: 4, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894'], shapePool: ['circle', 'square', 'triangle', 'star'] } },
      { id: 'brain_4', title: 'Sharp Mind', difficulty: 4, levelData: { shapeCount: 6, viewingTime: 4, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#F9CA24'], shapePool: ['circle', 'square', 'star', 'hexagon'] } },
      { id: 'brain_5', title: 'Quick Recall', difficulty: 5, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894', '#F9CA24'], shapePool: ['circle', 'square', 'triangle', 'star', 'diamond'] } },
      { id: 'brain_6', title: 'Memory Sprint', difficulty: 5, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894'], shapePool: ['circle', 'square', 'hexagon', 'diamond', 'heart'] } },
      { id: 'brain_7', title: 'Deep Dive', difficulty: 6, levelData: { shapeCount: 8, viewingTime: 3, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894', '#F9CA24'], shapePool: ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'] } },
      { id: 'brain_8', title: 'Expert Mode', difficulty: 7, levelData: { shapeCount: 9, viewingTime: 3, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894', '#F9CA24'], shapePool: ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'] } },
      { id: 'brain_9', title: 'Master Class', difficulty: 8, levelData: { shapeCount: 10, viewingTime: 2.5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894', '#F9CA24', '#E17055'], shapePool: ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'] } },
      { id: 'brain_10', title: 'Peak Performance', difficulty: 9, levelData: { shapeCount: 11, viewingTime: 2.5, colorPool: ['#0984E3', '#00CEC9', '#6C5CE7', '#00B894', '#F9CA24', '#E17055'], shapePool: ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon', 'heart'] } },
    ],
  },

  {
    id: 'double_gems_may_2026',
    name: 'Double Gem Weekend',
    description: 'All gem rewards doubled this weekend!',
    icon: 'diamond',
    color: '#6C5CE7',
    startDate: '2026-05-16',
    endDate: '2026-05-18',
    type: 'double_gems',
    gemMultiplier: 2,
    rewards: [
      { id: 'dg_may_1', name: '30 bonus gems', description: 'Complete 3 levels this weekend', icon: 'diamond', type: 'gems', amount: 30, threshold: 3 },
      { id: 'dg_may_2', name: '75 bonus gems', description: 'Complete 8 levels this weekend', icon: 'diamond', type: 'gems', amount: 75, threshold: 8 },
    ],
  },

  // ── JUNE 2026 ──
  {
    id: 'summer_sun_2026',
    name: 'Summer Sun',
    description: 'Hot shapes, warm colours. Summer is here!',
    icon: 'sunny-outline',
    color: '#F9CA24',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    type: 'themed_levels',
    rewards: [
      { id: 'summer_gems_1', name: '25 gems', description: 'Complete 2 summer levels', icon: 'diamond', type: 'gems', amount: 25, threshold: 2 },
      { id: 'summer_gems_2', name: '50 gems', description: 'Complete 5 summer levels', icon: 'diamond', type: 'gems', amount: 50, threshold: 5 },
      { id: 'summer_badge', name: 'Sunburst badge', description: 'Complete all 8 levels', icon: 'ribbon', type: 'badge', amount: 1, threshold: 8 },
    ],
    levels: [
      { id: 'summer_1', title: 'Sunrise', difficulty: 2, levelData: { shapeCount: 4, viewingTime: 5, colorPool: ['#F9CA24', '#E17055', '#FF6B6B'], shapePool: ['circle', 'star', 'triangle'] } },
      { id: 'summer_2', title: 'Beach Day', difficulty: 3, levelData: { shapeCount: 5, viewingTime: 4.5, colorPool: ['#F9CA24', '#E17055', '#0984E3', '#FF6B6B'], shapePool: ['circle', 'star', 'diamond', 'triangle'] } },
      { id: 'summer_3', title: 'Heatwave', difficulty: 4, levelData: { shapeCount: 6, viewingTime: 4, colorPool: ['#F9CA24', '#E17055', '#FF6B6B', '#FD79A8'], shapePool: ['circle', 'star', 'diamond', 'heart'] } },
      { id: 'summer_4', title: 'Poolside', difficulty: 4, levelData: { shapeCount: 6, viewingTime: 4, colorPool: ['#F9CA24', '#0984E3', '#00CEC9', '#E17055'], shapePool: ['circle', 'square', 'diamond', 'triangle'] } },
      { id: 'summer_5', title: 'Sandcastle', difficulty: 5, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#F9CA24', '#E17055', '#D4A012', '#00B894'], shapePool: ['square', 'triangle', 'diamond', 'hexagon'] } },
      { id: 'summer_6', title: 'Tropical', difficulty: 6, levelData: { shapeCount: 7, viewingTime: 3.5, colorPool: ['#F9CA24', '#E17055', '#00B894', '#FD79A8', '#0984E3'], shapePool: ['circle', 'heart', 'star', 'diamond', 'hexagon'] } },
      { id: 'summer_7', title: 'Sunset Glow', difficulty: 7, levelData: { shapeCount: 8, viewingTime: 3, colorPool: ['#F9CA24', '#E17055', '#FF6B6B', '#FD79A8', '#6C5CE7'], shapePool: ['circle', 'star', 'heart', 'diamond', 'triangle', 'hexagon'] } },
      { id: 'summer_8', title: 'Summer Finale', difficulty: 8, levelData: { shapeCount: 9, viewingTime: 3, colorPool: ['#F9CA24', '#E17055', '#FF6B6B', '#0984E3', '#00B894', '#6C5CE7'], shapePool: ['circle', 'star', 'heart', 'diamond', 'triangle', 'hexagon'] } },
    ],
  },

  {
    id: 'double_gems_jun_2026',
    name: 'Double Gem Weekend',
    description: 'All gem rewards doubled this weekend!',
    icon: 'diamond',
    color: '#6C5CE7',
    startDate: '2026-06-20',
    endDate: '2026-06-22',
    type: 'double_gems',
    gemMultiplier: 2,
    rewards: [
      { id: 'dg_jun_1', name: '30 bonus gems', description: 'Complete 3 levels this weekend', icon: 'diamond', type: 'gems', amount: 30, threshold: 3 },
      { id: 'dg_jun_2', name: '75 bonus gems', description: 'Complete 8 levels this weekend', icon: 'diamond', type: 'gems', amount: 75, threshold: 8 },
    ],
  },
];

// ── Public API ────────────────────────────────────────────────────────

/** Get all events currently active */
export function getActiveEvents(): SeasonalEvent[] {
  const today = new Date().toISOString().split('T')[0];
  return EVENTS_2026.filter(e => e.startDate <= today && e.endDate >= today);
}

/** Get all upcoming events (starting within next 14 days) */
export function getUpcomingEvents(): SeasonalEvent[] {
  const today = new Date();
  const twoWeeks = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  return EVENTS_2026.filter(e => e.startDate > todayStr && e.startDate <= twoWeeks);
}

/** Get a specific event by ID */
export function getEventById(id: string): SeasonalEvent | undefined {
  return EVENTS_2026.find(e => e.id === id);
}

/** Check if a double gem event is active right now */
export function isDoubleGemActive(): { active: boolean; multiplier: number; eventName: string } {
  const active = getActiveEvents().find(e => e.type === 'double_gems');
  return {
    active: !!active,
    multiplier: active?.gemMultiplier ?? 1,
    eventName: active?.name ?? '',
  };
}

/** Get progress for an event */
export async function getEventProgress(eventId: string): Promise<EventProgress> {
  const all = await loadProgress();
  return all[eventId] ?? { eventId, levelsCompleted: 0, gemsEarned: 0, claimedRewards: [], lastPlayedAt: null };
}

/** Record a level completion in an event */
export async function recordEventLevelComplete(eventId: string, gemsEarned: number): Promise<void> {
  const all = await loadProgress();
  const prev = all[eventId] ?? { eventId, levelsCompleted: 0, gemsEarned: 0, claimedRewards: [], lastPlayedAt: null };
  all[eventId] = {
    ...prev,
    levelsCompleted: prev.levelsCompleted + 1,
    gemsEarned: prev.gemsEarned + gemsEarned,
    lastPlayedAt: new Date().toISOString(),
  };
  await saveProgress(all);
}

/** Claim a reward if threshold is met. Returns amount (0 if already claimed or not met). */
export async function claimEventReward(eventId: string, rewardId: string): Promise<number> {
  const event = getEventById(eventId);
  if (!event) return 0;

  const reward = event.rewards.find(r => r.id === rewardId);
  if (!reward) return 0;

  const all = await loadProgress();
  const progress = all[eventId] ?? { eventId, levelsCompleted: 0, gemsEarned: 0, claimedRewards: [], lastPlayedAt: null };

  if (progress.claimedRewards.includes(rewardId)) return 0;
  if (progress.levelsCompleted < reward.threshold) return 0;

  progress.claimedRewards.push(rewardId);
  all[eventId] = progress;
  await saveProgress(all);

  return reward.amount;
}

/** Get days remaining for an event */
export function getDaysRemaining(event: SeasonalEvent): number {
  const now = new Date();
  // Parse as UTC so the countdown stays consistent with getActiveEvents
  // (which compares against UTC "today"). Without the Z, this parsed as
  // local time and could show "0 days" while getActiveEvents still
  // listed the event as active on the same calendar moment.
  const end = new Date(event.endDate + 'T23:59:59Z');
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

/** Get all events (for debugging/admin) */
export function getAllEvents(): SeasonalEvent[] {
  return EVENTS_2026;
}
