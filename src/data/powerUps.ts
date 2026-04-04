import { bundlePrice } from '@/src/utils/scoring';

export interface PowerUpDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  bundleCost: number;
  bundleSize: number;
  icon: string;
  color: string;
  bgColor: string;
  modes: string[]; // ['all'], ['classic'], ['speed_recall'], etc.
}

export const ALL_POWERUPS: PowerUpDef[] = [
  // Universal
  { id: 'extra_life', name: 'Extra Life', description: 'Prevents 1 life loss on failure', cost: 35, bundleCost: bundlePrice(35, 3), bundleSize: 3, icon: 'heart-shield', color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.06)', modes: ['all'] },

  // Classic
  { id: 'slowTime', name: 'Slow Time', description: '+3s viewing time', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'timer', color: '#0984E3', bgColor: 'rgba(9,132,227,0.06)', modes: ['classic'] },
  { id: 'peek', name: 'Peek', description: 'Flash scene 1s during questions', cost: 40, bundleCost: bundlePrice(40, 3), bundleSize: 3, icon: 'eye', color: '#6C5CE7', bgColor: 'rgba(108,92,231,0.06)', modes: ['classic'] },
  { id: 'fiftyFifty', name: '50/50', description: 'Remove 2 wrong answers', cost: 25, bundleCost: bundlePrice(25, 3), bundleSize: 3, icon: 'scissors', color: '#00B894', bgColor: 'rgba(0,184,148,0.06)', modes: ['classic'] },
  { id: 'skip', name: 'Skip', description: 'Skip a question (auto-correct)', cost: 50, bundleCost: bundlePrice(50, 3), bundleSize: 3, icon: 'fast-forward', color: '#D4A012', bgColor: 'rgba(212,160,18,0.06)', modes: ['classic'] },

  // Speed Recall
  { id: 'sr_slow_time', name: 'Slow Time', description: '+2s scene viewing', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'timer', color: '#0984E3', bgColor: 'rgba(9,132,227,0.06)', modes: ['speed_recall'] },
  { id: 'sr_ghost_outline', name: 'Ghost Outline', description: 'Faint zones show general areas', cost: 45, bundleCost: bundlePrice(45, 3), bundleSize: 3, icon: 'ghost', color: '#A29BFE', bgColor: 'rgba(162,155,254,0.06)', modes: ['speed_recall'] },
  { id: 'sr_second_chance', name: 'Second Chance', description: 'Retry if tap is far off', cost: 35, bundleCost: bundlePrice(35, 3), bundleSize: 3, icon: 'refresh', color: '#E17055', bgColor: 'rgba(225,112,85,0.06)', modes: ['speed_recall'] },

  // Snap Match
  { id: 'sm_slow_flash', name: 'Slow Flash', description: '+1.5s on Scene A', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'timer', color: '#0984E3', bgColor: 'rgba(9,132,227,0.06)', modes: ['snap_match'] },
  { id: 'sm_highlight', name: 'Highlight', description: 'Subtle shimmer on the change', cost: 40, bundleCost: bundlePrice(40, 3), bundleSize: 3, icon: 'sparkle', color: '#D4A012', bgColor: 'rgba(212,160,18,0.06)', modes: ['snap_match'] },
  { id: 'sm_freeze', name: 'Freeze', description: '+3s pause on Scene B', cost: 35, bundleCost: bundlePrice(35, 3), bundleSize: 3, icon: 'snowflake', color: '#00CEC9', bgColor: 'rgba(0,206,201,0.06)', modes: ['snap_match'] },

  // Sequence
  { id: 'seq_replay_one', name: 'Replay One', description: 'See the last shape again', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'replay', color: '#6C5CE7', bgColor: 'rgba(108,92,231,0.06)', modes: ['sequence'] },
  { id: 'seq_safety_net', name: 'Safety Net', description: "1 wrong tap doesn't end the round", cost: 45, bundleCost: bundlePrice(45, 3), bundleSize: 3, icon: 'shield', color: '#00B894', bgColor: 'rgba(0,184,148,0.06)', modes: ['sequence'] },

  // Counting Blitz
  { id: 'cb_slow_motion', name: 'Slow Motion', description: 'Shapes stay 50% longer', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'slow', color: '#0984E3', bgColor: 'rgba(9,132,227,0.06)', modes: ['counting_blitz'] },
  { id: 'cb_colour_filter', name: 'Colour Filter', description: 'Brief flash of the asked colour', cost: 50, bundleCost: bundlePrice(50, 3), bundleSize: 3, icon: 'filter', color: '#FD79A8', bgColor: 'rgba(253,121,168,0.06)', modes: ['counting_blitz'] },

  // Colour Chain
  { id: 'cc_slow_time', name: 'Slow Time', description: '+2s grid viewing', cost: 30, bundleCost: bundlePrice(30, 3), bundleSize: 3, icon: 'timer', color: '#0984E3', bgColor: 'rgba(9,132,227,0.06)', modes: ['colour_chain'] },
  { id: 'cc_reveal_one', name: 'Reveal One', description: '1 tile stays coloured as an anchor', cost: 40, bundleCost: bundlePrice(40, 3), bundleSize: 3, icon: 'pin', color: '#D4A012', bgColor: 'rgba(212,160,18,0.06)', modes: ['colour_chain'] },
];

/** Get power-ups available for a specific mode */
export function getPowerupsForMode(mode: string): PowerUpDef[] {
  if (mode === 'all') return ALL_POWERUPS.filter(p => p.modes.includes('all'));
  return ALL_POWERUPS.filter(p => p.modes.includes(mode) || p.modes.includes('all'));
}

/** Get a single power-up by ID */
export function getPowerupById(id: string): PowerUpDef | undefined {
  return ALL_POWERUPS.find(p => p.id === id);
}

/** All power-up IDs */
export const ALL_POWERUP_IDS = ALL_POWERUPS.map(p => p.id);

/** Mode filter options for the shop */
export const MODE_FILTERS = [
  { id: 'classic', name: 'Classic', color: '#6C5CE7' },
  { id: 'speed_recall', name: 'Speed', color: '#FF6B6B' },
  { id: 'snap_match', name: 'Snap', color: '#0984E3' },
  { id: 'sequence', name: 'Sequence', color: '#D4A012' },
  { id: 'counting_blitz', name: 'Counting', color: '#00B894' },
  { id: 'colour_chain', name: 'Colour', color: '#FD79A8' },
];

/** Power-up emoji icons for shop display */
export const POWERUP_EMOJIS: Record<string, string> = {
  'extra_life': '\u2764\uFE0F\u200D\uD83D\uDD25',
  'slowTime': '\u23F1',
  'peek': '\uD83D\uDC41',
  'fiftyFifty': '\u2702\uFE0F',
  'skip': '\u23ED',
  'sr_slow_time': '\u23F1',
  'sr_ghost_outline': '\uD83D\uDC7B',
  'sr_second_chance': '\uD83D\uDD04',
  'sm_slow_flash': '\u23F1',
  'sm_highlight': '\u2728',
  'sm_freeze': '\u2744\uFE0F',
  'seq_replay_one': '\uD83D\uDD01',
  'seq_safety_net': '\uD83D\uDEE1\uFE0F',
  'cb_slow_motion': '\uD83D\uDC0C',
  'cb_colour_filter': '\uD83C\uDFA8',
  'cc_slow_time': '\u23F1',
  'cc_reveal_one': '\uD83D\uDCCC',
};
