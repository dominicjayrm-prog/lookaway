import { bundlePrice, type PowerUpId } from '@/src/utils/scoring';
import { t } from '@/src/i18n';

export interface PowerUpDef {
  id: string;
  /** Translation key for the power-up name — resolved via t() in consumers. */
  nameKey: string;
  /** Translation key for the description. */
  descKey: string;
  /** Resolved English name at the time of read (kept for logs/analytics
   *  + backward-compat with anything still using `.name` directly). */
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

/** Build a PowerUpDef. `name` + `description` resolve via `t()` lazily
 *  using Object.defineProperty so every call site sees the active
 *  locale — static evaluation at module import would cache English
 *  forever because t() would run before the store hydrates.
 *
 *  Callers that need the key directly (for logs / analytics keyed by
 *  English) can reach `nameKey` / `descKey`. */
function mkPowerUp(
  id: string,
  nameKey: string,
  descKey: string,
  cost: number,
  bundleSize: number,
  icon: string,
  color: string,
  bgColor: string,
  modes: string[],
): PowerUpDef {
  const def = {
    id, nameKey, descKey,
    cost, bundleCost: bundlePrice(cost, bundleSize), bundleSize,
    icon, color, bgColor, modes,
  } as PowerUpDef;
  Object.defineProperty(def, 'name', { get: () => t(nameKey), enumerable: true });
  Object.defineProperty(def, 'description', { get: () => t(descKey), enumerable: true });
  return def;
}

export const ALL_POWERUPS: PowerUpDef[] = [
  // Universal
  mkPowerUp('extra_life', 'data.powerups.extra_life_name', 'data.powerups.extra_life_desc', 35, 3, 'heart-shield', '#FF6B6B', 'rgba(255,107,107,0.06)', ['all']),

  // Classic
  mkPowerUp('slowTime', 'data.powerups.slowTime_name', 'data.powerups.slowTime_desc', 30, 3, 'timer', '#0984E3', 'rgba(9,132,227,0.06)', ['classic']),
  mkPowerUp('peek', 'data.powerups.peek_name', 'data.powerups.peek_desc', 40, 3, 'eye', '#6C5CE7', 'rgba(108,92,231,0.06)', ['classic']),
  mkPowerUp('fiftyFifty', 'data.powerups.fiftyFifty_name', 'data.powerups.fiftyFifty_desc', 25, 3, 'scissors', '#00B894', 'rgba(0,184,148,0.06)', ['classic']),
  mkPowerUp('skip', 'data.powerups.skip_name', 'data.powerups.skip_desc', 50, 3, 'fast-forward', '#D4A012', 'rgba(212,160,18,0.06)', ['classic']),

  // Speed Recall
  mkPowerUp('sr_slow_time', 'data.powerups.sr_slow_time_name', 'data.powerups.sr_slow_time_desc', 30, 3, 'timer', '#0984E3', 'rgba(9,132,227,0.06)', ['speed_recall']),
  mkPowerUp('sr_ghost_outline', 'data.powerups.sr_ghost_outline_name', 'data.powerups.sr_ghost_outline_desc', 45, 3, 'ghost', '#A29BFE', 'rgba(162,155,254,0.06)', ['speed_recall']),
  mkPowerUp('sr_second_chance', 'data.powerups.sr_second_chance_name', 'data.powerups.sr_second_chance_desc', 35, 3, 'refresh', '#E17055', 'rgba(225,112,85,0.06)', ['speed_recall']),

  // Snap Match
  mkPowerUp('sm_slow_flash', 'data.powerups.sm_slow_flash_name', 'data.powerups.sm_slow_flash_desc', 30, 3, 'timer', '#0984E3', 'rgba(9,132,227,0.06)', ['snap_match']),
  mkPowerUp('sm_highlight', 'data.powerups.sm_highlight_name', 'data.powerups.sm_highlight_desc', 40, 3, 'sparkle', '#D4A012', 'rgba(212,160,18,0.06)', ['snap_match']),
  mkPowerUp('sm_freeze', 'data.powerups.sm_freeze_name', 'data.powerups.sm_freeze_desc', 35, 3, 'snowflake', '#00CEC9', 'rgba(0,206,201,0.06)', ['snap_match']),

  // Sequence
  mkPowerUp('seq_replay_one', 'data.powerups.seq_replay_one_name', 'data.powerups.seq_replay_one_desc', 30, 3, 'replay', '#6C5CE7', 'rgba(108,92,231,0.06)', ['sequence']),
  mkPowerUp('seq_safety_net', 'data.powerups.seq_safety_net_name', 'data.powerups.seq_safety_net_desc', 45, 3, 'shield', '#00B894', 'rgba(0,184,148,0.06)', ['sequence']),

  // Counting Blitz
  mkPowerUp('cb_slow_motion', 'data.powerups.cb_slow_motion_name', 'data.powerups.cb_slow_motion_desc', 30, 3, 'slow', '#0984E3', 'rgba(9,132,227,0.06)', ['counting_blitz']),
  mkPowerUp('cb_colour_filter', 'data.powerups.cb_colour_filter_name', 'data.powerups.cb_colour_filter_desc', 50, 3, 'snowflake', '#FD79A8', 'rgba(253,121,168,0.06)', ['counting_blitz']),

  // Colour Chain
  mkPowerUp('cc_slow_time', 'data.powerups.cc_slow_time_name', 'data.powerups.cc_slow_time_desc', 30, 3, 'timer', '#0984E3', 'rgba(9,132,227,0.06)', ['colour_chain']),
  mkPowerUp('cc_reveal_one', 'data.powerups.cc_reveal_one_name', 'data.powerups.cc_reveal_one_desc', 40, 3, 'pin', '#D4A012', 'rgba(212,160,18,0.06)', ['colour_chain']),
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

/** Power-ups indexed by ID for quick lookup */
export const POWER_UPS: Record<string, PowerUpDef> = Object.fromEntries(ALL_POWERUPS.map(p => [p.id, p]));

/** Classic question-phase power-up IDs. Typed as `PowerUpId[]` so the
 *  PowerUpBar can index typed records (`usedThisLevel[id]`,
 *  `powerUps[id]`) without per-iteration casts. */
export const QUESTION_POWER_UPS: PowerUpId[] = ['peek', 'fiftyFifty', 'skip'];

/** Mode filter options for the shop — `name` is a live-resolving
 *  getter so switching language updates the shop's mode pills
 *  without a remount. */
interface ModeFilterDef { id: string; nameKey: string; name: string; color: string; }
function mkModeFilter(id: string, nameKey: string, color: string): ModeFilterDef {
  const def = { id, nameKey, color } as ModeFilterDef;
  Object.defineProperty(def, 'name', { get: () => t(nameKey), enumerable: true });
  return def;
}
export const MODE_FILTERS: ModeFilterDef[] = [
  mkModeFilter('classic', 'data.modes.classic', '#6C5CE7'),
  mkModeFilter('speed_recall', 'data.modes.speed_recall_short', '#FF6B6B'),
  mkModeFilter('snap_match', 'data.modes.snap_match_short', '#0984E3'),
  mkModeFilter('sequence', 'data.modes.sequence', '#D4A012'),
  mkModeFilter('counting_blitz', 'data.modes.counting_blitz_short', '#00B894'),
  mkModeFilter('colour_chain', 'data.modes.colour_chain_short', '#FD79A8'),
];

/** Power-up emoji icons for shop display */
export const POWERUP_EMOJIS: Record<string, string> = {
  'extra_life': '❤️‍🔥',
  'slowTime': '⏱',
  'peek': '👁',
  'fiftyFifty': '✂️',
  'skip': '⏭',
  'sr_slow_time': '⏱',
  'sr_ghost_outline': '👻',
  'sr_second_chance': '🔄',
  'sm_slow_flash': '⏱',
  'sm_highlight': '✨',
  'sm_freeze': '❄️',
  'seq_replay_one': '🔁',
  'seq_safety_net': '🛡️',
  'cb_slow_motion': '🐌',
  'cb_colour_filter': '🎨',
  'cc_slow_time': '⏱',
  'cc_reveal_one': '📌',
};

/**
 * Map a power-up icon token (from the `icon` field on POWER_UPS
 * entries) to a real Ionicons glyph name. The tokens are
 * design-friendly aliases like `"scissors"` / `"fast-forward"` /
 * `"ghost"` that don't all correspond to valid Ionicons — this
 * translator guarantees every token renders a sensible glyph
 * instead of the question-mark fallback.
 *
 * Anything unknown renders a generic `flash` so a future misnamed
 * icon is obvious but doesn't break the layout.
 */
export function iconForPowerUp(token: string): string {
  switch (token) {
    case 'timer': return 'timer';
    case 'eye': return 'eye';
    case 'scissors': return 'cut';
    case 'fast-forward': return 'play-forward';
    case 'ghost': return 'skull-outline';
    case 'refresh': return 'refresh';
    case 'sparkle': return 'sparkles';
    case 'snowflake': return 'snow';
    case 'replay': return 'play-back';
    case 'shield': return 'shield';
    case 'slow': return 'hourglass';
    case 'filter': return 'color-palette';
    case 'pin': return 'pin';
    case 'heart-shield': return 'heart';
    default: return 'flash';
  }
}
