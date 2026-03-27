import type { Scene, SceneObject, Question } from './game';

export type DailyMode = 'classic' | 'speed' | 'spot_the_change';

export const DAILY_MODE_SCHEDULE: Record<string, DailyMode> = {
  monday: 'classic',
  tuesday: 'speed',
  wednesday: 'classic',
  thursday: 'spot_the_change',
  friday: 'classic',
  saturday: 'speed',
  sunday: 'classic',
};

export const MODE_INFO: Record<DailyMode, { name: string; icon: string; description: string; subtitle: string }> = {
  classic: { name: 'Classic', icon: String.fromCodePoint(0x1F4CB), description: '5 scenes, 5 questions each', subtitle: '25 questions total' },
  speed: { name: 'Speed Round', icon: String.fromCodePoint(0x26A1), description: '10 scenes, 2 seconds each', subtitle: '1 question per scene' },
  spot_the_change: { name: 'Spot The Change', icon: String.fromCodePoint(0x1F50D), description: '5 rounds, find what changed', subtitle: 'Tap the change' },
};

export interface SpeedScene { id: string; viewTime: number; objects: SceneObject[]; question: Question; }
export interface SpeedChallenge { mode: 'speed'; scenes: SpeedScene[]; }
export type ChangeType = 'color_change' | 'position_change' | 'removed' | 'added' | 'shape_change' | 'size_change';
export interface SpotChange { type: ChangeType; objectId: string; description: string; targetArea: { x: number; y: number; radius: number }; }
export interface SpotRound { id: string; viewTime: number; originalScene: { objects: SceneObject[] }; modifiedScene: { objects: SceneObject[] }; change: SpotChange; }
export interface SpotTheChangeChallenge { mode: 'spot_the_change'; rounds: SpotRound[]; }
export interface ClassicChallenge { mode: 'classic'; scenes: Scene[]; }
export type DailyChallenge = ClassicChallenge | SpeedChallenge | SpotTheChangeChallenge;
export interface DailyResult { date: string; mode: DailyMode; score: number; rawScore: string; timeSeconds?: number; answers: { correct: boolean; timeMs?: number }[]; sceneResults?: { answers: { correct: boolean }[] }[]; shareText: string; completedAt: string; }

export function getTodayMode(): DailyMode {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return DAILY_MODE_SCHEDULE[days[new Date().getDay()]] ?? 'classic';
}

export function getModeForDay(dayOffset: number): DailyMode {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const date = new Date(); date.setDate(date.getDate() + dayOffset);
  return DAILY_MODE_SCHEDULE[days[date.getDay()]] ?? 'classic';
}

export function getWeekSchedule(): { dayName: string; dayShort: string; mode: DailyMode; isToday: boolean; date: Date }[] {
  const today = new Date();
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const shorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((dayName, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    return { dayName, dayShort: shorts[i], mode: DAILY_MODE_SCHEDULE[dayName] ?? 'classic' as DailyMode, isToday: date.toDateString() === today.toDateString(), date };
  });
}
