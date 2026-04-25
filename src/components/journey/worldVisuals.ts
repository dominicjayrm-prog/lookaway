import type { WorldTheme } from '@/src/data/unifiedJourney';

export type ParticleType = 'firefly' | 'sand' | 'bubble' | 'snow' | 'ember';

export interface WorldVisualConfig {
  /** Solid fallback if gradients fail / are not rendered. */
  backgroundColor: string;
  /** Three-stop vertical gradient defining the biome's atmosphere. All
   *  worlds use the same pastel purple now — the journey is one
   *  continuous chill canvas, not five visually-distinct biomes. */
  gradientColors: readonly [string, string, string];
  /** Path/connector colour override — picked to contrast against the
   *  gradient without competing with the level-node accent. */
  pathColor: string;
  pathGlow: string;
  /** Tint for the floating particles. */
  particleColor: string;
  particleType: ParticleType;
  /** Describes the vibe shown in the intro modal and the gate banner. */
  atmosphere: string;
}

// One single pastel-purple palette shared by every world. Keeping the
// per-world map shape so the rest of the codebase doesn't have to know
// the visual identity collapsed — they can still look up
// WORLD_VISUALS[theme] without crashing.
const PURPLE_GRADIENT = ['#F2EBFF', '#E1D2FF', '#CDB4FF'] as const;
const PURPLE_BG = '#E1D2FF';
const PURPLE_PATH = '#FFFFFF';
const PURPLE_PATH_GLOW = 'rgba(205, 180, 255, 0.4)';
const PURPLE_PARTICLE = '#FFFFFF';

export const WORLD_VISUALS: Record<WorldTheme, WorldVisualConfig> = {
  emerald_grove: {
    backgroundColor: PURPLE_BG,
    gradientColors: PURPLE_GRADIENT,
    pathColor: PURPLE_PATH,
    pathGlow: PURPLE_PATH_GLOW,
    particleColor: PURPLE_PARTICLE,
    particleType: 'firefly',
    atmosphere: 'A peaceful grove where your journey begins. Trees breathe slow; light filters through the canopy.',
  },
  amber_dunes: {
    backgroundColor: PURPLE_BG,
    gradientColors: PURPLE_GRADIENT,
    pathColor: PURPLE_PATH,
    pathGlow: PURPLE_PATH_GLOW,
    particleColor: PURPLE_PARTICLE,
    particleType: 'sand',
    atmosphere: 'The sands test your endurance. Ancient ruins rise from the dunes; every grain of detail matters.',
  },
  crystal_depths: {
    backgroundColor: PURPLE_BG,
    gradientColors: PURPLE_GRADIENT,
    pathColor: PURPLE_PATH,
    pathGlow: PURPLE_PATH_GLOW,
    particleColor: PURPLE_PARTICLE,
    particleType: 'bubble',
    atmosphere: 'Beneath the surface, coral bridges wind between luminous forms. Hold your breath and read the current.',
  },
  aurora_peaks: {
    backgroundColor: PURPLE_BG,
    gradientColors: PURPLE_GRADIENT,
    pathColor: PURPLE_PATH,
    pathGlow: PURPLE_PATH_GLOW,
    particleColor: PURPLE_PARTICLE,
    particleType: 'snow',
    atmosphere: 'The cold thins your thoughts. Aurora bands drift across peaks of ice — sharp, quiet, unforgiving.',
  },
  inferno_core: {
    backgroundColor: PURPLE_BG,
    gradientColors: PURPLE_GRADIENT,
    pathColor: PURPLE_PATH,
    pathGlow: PURPLE_PATH_GLOW,
    particleColor: PURPLE_PARTICLE,
    particleType: 'ember',
    atmosphere: 'The core burns. Obsidian pillars lean over lava rivers; only the sharpest minds make it through.',
  },
};

/** The single pastel purple gradient + accent the journey tab paints
 *  with. Exposed separately so screens don't have to look up a world
 *  to get the chrome colour. */
export const JOURNEY_PALETTE = {
  bg: PURPLE_BG,
  gradientColors: PURPLE_GRADIENT,
  pathColor: PURPLE_PATH,
  pathGlow: PURPLE_PATH_GLOW,
  /** A medium-saturated purple accent used for buttons, the progress
   *  fill, and the highlight on the current level node. */
  accent: '#7C5CE7',
  /** A bolder purple used for primary CTA gradients (Continue card). */
  accentDeep: '#5E4BC9',
} as const;
