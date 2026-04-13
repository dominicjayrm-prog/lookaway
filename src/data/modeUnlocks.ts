/**
 * Mode unlock celebration data — static info shown in the unlock
 * modal when a player completes the qualifying world.
 *
 * Unlock rules (which world completion triggers which mode):
 *   Classic World 1     → Speed Recall
 *   Classic World 2     → Snap Match
 *   Speed Recall World 1 → Sequence
 *   Snap Match World 1   → Counting Blitz
 *   Sequence World 1     → Colour Chain
 */

export interface ModeUnlockInfo {
  name: string;
  color: string;
  letter: string;
  tagline: string;
  description: string;
  trains: string[];
  stat: string;
  worlds: number;
  levels: number;
}

export const MODE_UNLOCK_DATA: Record<string, ModeUnlockInfo> = {
  speed_recall: {
    name: 'Speed Recall',
    color: '#FF6B6B',
    letter: 'S',
    tagline: 'A new way to train',
    description: 'Remember exact positions, then tap where each shape was. Think fast - the clock is ticking.',
    trains: ['Position memory', 'Reaction speed', 'Spatial precision'],
    stat: 'Players who add Speed Recall improve 23% faster',
    worlds: 3,
    levels: 45,
  },
  snap_match: {
    name: 'Snap Match',
    color: '#0984E3',
    letter: 'S',
    tagline: 'Train your eye for detail',
    description: 'Two scenes flash one after another. One thing changed. Find it before time runs out.',
    trains: ['Change detection', 'Attention to detail', 'Visual scanning'],
    stat: 'Sharpens the same brain circuits used for proofreading',
    worlds: 3,
    levels: 45,
  },
  sequence: {
    name: 'Sequence',
    color: '#D4A012',
    letter: 'S',
    tagline: 'Order matters',
    description: 'Shapes appear one at a time. Remember the order and tap them back.',
    trains: ['Sequential memory', 'Pattern retention', 'Order recall'],
    stat: 'Sequential memory is linked to better learning and problem-solving',
    worlds: 3,
    levels: 36,
  },
  counting_blitz: {
    name: 'Counting Blitz',
    color: '#00B894',
    letter: 'C',
    tagline: 'Focus through chaos',
    description: 'Shapes pop in and out rapidly. Count the right colour while ignoring distractions.',
    trains: ['Focus under pressure', 'Selective attention', 'Counting accuracy'],
    stat: 'Attention training improves productivity by up to 31%',
    worlds: 2,
    levels: 30,
  },
  colour_chain: {
    name: 'Colour Chain',
    color: '#FD79A8',
    letter: 'C',
    tagline: 'Paint it from memory',
    description: 'Memorise a grid of colours, then recall exactly which colour was where.',
    trains: ['Colour memory', 'Grid navigation', 'Systematic recall'],
    stat: 'Colour-spatial exercises strengthen pattern recognition',
    worlds: 2,
    levels: 24,
  },
};

/** Which world completion triggers which mode unlock.
 *  Key = mode being unlocked, value = what the player must complete. */
export const MODE_UNLOCK_RULES: Record<string, { requires: string; world: number }> = {
  speed_recall:  { requires: 'classic', world: 1 },
  snap_match:    { requires: 'classic', world: 2 },
  sequence:      { requires: 'speed_recall', world: 1 },
  counting_blitz: { requires: 'snap_match', world: 1 },
  colour_chain:  { requires: 'sequence', world: 1 },
};

/** Check which mode (if any) should unlock after completing a world.
 *  Returns the mode id or null if nothing unlocks. */
export function checkModeUnlock(
  completedMode: string,
  completedWorld: number,
  alreadyUnlockedModes: string[],
): string | null {
  for (const [modeId, rule] of Object.entries(MODE_UNLOCK_RULES)) {
    if (rule.requires === completedMode && rule.world === completedWorld) {
      if (!alreadyUnlockedModes.includes(modeId)) {
        return modeId;
      }
    }
  }
  return null;
}
