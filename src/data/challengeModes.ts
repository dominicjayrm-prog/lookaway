import { t } from '@/src/i18n';

export interface ChallengeMode {
  id: string;
  /** Display name — live-resolves against i18n so switching language
   *  in Settings updates every challenge card on next render. */
  name: string;
  description: string;
  howItWorks: string;
  color: string;
  /** Uppercase localised badge label (e.g. "ORIGINAL" / "EXCLUSIVO"). */
  badge: string;
  rounds: number;
  /** Localised round count label (e.g. "5 scenes" / "5 escenas"). */
  roundLabel: string;
  /** Localised estimated time (e.g. "~3 min"). */
  estimatedTime: string;
}

/** Static per-mode shape keyed by id. Text fields are computed via
 *  live getters (see mkMode) so every render reads from the active
 *  locale — no need to re-instantiate when the user flips language.
 *
 *  The unit & minutes values below are intentionally fixed per mode:
 *  classic matches use "scenes" (5 scenes from the campaign), every
 *  other mode runs discrete "rounds". Minutes are rough, matching the
 *  English copy the UI previously shipped. */
type ModeConfig = {
  id: string;
  color: string;
  rounds: number;
  unit: 'scenes' | 'rounds';
  minutes: number;
  badgeKey: 'challenge.original' | 'challenge.exclusive';
  descKey: string;
  howKey: string;
};

const CONFIGS: Record<string, ModeConfig> = {
  classic: {
    id: 'classic', color: '#6C5CE7', rounds: 5, unit: 'scenes', minutes: 3,
    badgeKey: 'challenge.original',
    descKey: 'challenge.mode_classic_desc',
    howKey: 'challenge.mode_classic_how',
  },
  speed_recall: {
    id: 'speed_recall', color: '#FF6B6B', rounds: 5, unit: 'rounds', minutes: 2,
    badgeKey: 'challenge.exclusive',
    descKey: 'challenge.mode_speed_recall_desc',
    howKey: 'challenge.mode_speed_recall_how',
  },
  snap_match: {
    id: 'snap_match', color: '#0984E3', rounds: 5, unit: 'rounds', minutes: 2,
    badgeKey: 'challenge.exclusive',
    descKey: 'challenge.mode_snap_match_desc',
    howKey: 'challenge.mode_snap_match_how',
  },
  sequence: {
    id: 'sequence', color: '#D4A012', rounds: 5, unit: 'rounds', minutes: 2,
    badgeKey: 'challenge.exclusive',
    descKey: 'challenge.mode_sequence_desc',
    howKey: 'challenge.mode_sequence_how',
  },
  counting_blitz: {
    id: 'counting_blitz', color: '#00B894', rounds: 5, unit: 'rounds', minutes: 2,
    badgeKey: 'challenge.exclusive',
    descKey: 'challenge.mode_counting_blitz_desc',
    howKey: 'challenge.mode_counting_blitz_how',
  },
  colour_chain: {
    id: 'colour_chain', color: '#FD79A8', rounds: 6, unit: 'rounds', minutes: 2,
    badgeKey: 'challenge.exclusive',
    descKey: 'challenge.mode_colour_chain_desc',
    howKey: 'challenge.mode_colour_chain_how',
  },
};

function roundLabelFor(cfg: ModeConfig): string {
  if (cfg.unit === 'scenes') {
    return cfg.rounds === 1
      ? t('challenge.meta_scenes_one')
      : t('challenge.meta_scenes_many', { count: cfg.rounds });
  }
  return cfg.rounds === 1
    ? t('challenge.meta_rounds_one')
    : t('challenge.meta_rounds_many', { count: cfg.rounds });
}

function nameKeyFor(id: string): string {
  return `data.campaigns.${id}_name`;
}

function mkMode(cfg: ModeConfig): ChallengeMode {
  const obj = {
    id: cfg.id,
    color: cfg.color,
    rounds: cfg.rounds,
  } as ChallengeMode;
  Object.defineProperty(obj, 'name', { get: () => t(nameKeyFor(cfg.id)), enumerable: true });
  Object.defineProperty(obj, 'description', { get: () => t(cfg.descKey), enumerable: true });
  Object.defineProperty(obj, 'howItWorks', { get: () => t(cfg.howKey), enumerable: true });
  Object.defineProperty(obj, 'badge', { get: () => t(cfg.badgeKey), enumerable: true });
  Object.defineProperty(obj, 'roundLabel', { get: () => roundLabelFor(cfg), enumerable: true });
  Object.defineProperty(obj, 'estimatedTime', {
    get: () => t('challenge.meta_time_approx', { minutes: cfg.minutes }),
    enumerable: true,
  });
  return obj;
}

export const CHALLENGE_MODES: Record<string, ChallengeMode> = Object.fromEntries(
  Object.entries(CONFIGS).map(([id, cfg]) => [id, mkMode(cfg)]),
);

export const MODE_ORDER = ['classic', 'speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];
export const EXCLUSIVE_MODES = MODE_ORDER.filter(id => id !== 'classic');

export function getMaxScore(mode: string): number {
  switch (mode) {
    case 'classic': return 100;
    case 'speed_recall': return 2500;
    case 'snap_match': return 500;
    case 'sequence': return 910;
    case 'counting_blitz': return 500;
    case 'colour_chain': return 600;
    default: return 100;
  }
}

export function getScorePercentage(mode: string, rawScore: number): number {
  if (mode === 'classic') return rawScore;
  return Math.min(100, Math.round((rawScore / getMaxScore(mode)) * 100));
}
