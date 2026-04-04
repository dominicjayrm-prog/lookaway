import { POWER_UP_COSTS, bundlePrice } from '@/src/utils/scoring';
import type { PowerUpId } from '@/src/utils/scoring';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  description: string;
  icon: string; // Ionicons name
  cost: number;
  bundleCost: number;
  bundleSize: number;
  phase: 'memorise' | 'question';
  color: string;
  bgColor: string;
}

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = {
  slowTime: {
    id: 'slowTime',
    name: 'Slow Time',
    description: '+3s viewing time',
    icon: 'timer-outline',
    cost: POWER_UP_COSTS.slowTime,
    bundleCost: bundlePrice(POWER_UP_COSTS.slowTime, 3),
    bundleSize: 3,
    phase: 'memorise',
    color: '#0984E3',
    bgColor: 'rgba(9,132,227,0.06)',
  },
  peek: {
    id: 'peek',
    name: 'Peek',
    description: 'Flash scene 1.5s',
    icon: 'eye-outline',
    cost: POWER_UP_COSTS.peek,
    bundleCost: bundlePrice(POWER_UP_COSTS.peek, 3),
    bundleSize: 3,
    phase: 'question',
    color: '#6C5CE7',
    bgColor: 'rgba(108,92,231,0.06)',
  },
  fiftyFifty: {
    id: 'fiftyFifty',
    name: '50/50',
    description: 'Remove 2 wrong answers',
    icon: 'cut-outline',
    cost: POWER_UP_COSTS.fiftyFifty,
    bundleCost: bundlePrice(POWER_UP_COSTS.fiftyFifty, 3),
    bundleSize: 3,
    phase: 'question',
    color: '#00B894',
    bgColor: 'rgba(0,184,148,0.06)',
  },
  skip: {
    id: 'skip',
    name: 'Skip',
    description: 'Auto-correct question',
    icon: 'play-skip-forward-outline',
    cost: POWER_UP_COSTS.skip,
    bundleCost: bundlePrice(POWER_UP_COSTS.skip, 3),
    bundleSize: 3,
    phase: 'question',
    color: '#D4A012',
    bgColor: 'rgba(212,160,18,0.06)',
  },
};

export const QUESTION_POWER_UPS: PowerUpId[] = ['peek', 'fiftyFifty', 'skip'];
export const MEMORISE_POWER_UPS: PowerUpId[] = ['slowTime'];
