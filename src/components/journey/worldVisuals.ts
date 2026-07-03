import type { WorldTheme } from '@/src/data/unifiedJourney';

export type ParticleType = 'firefly' | 'sand' | 'bubble' | 'snow' | 'ember';

export interface WorldVisualConfig {
  /** Solid ambient colour for chrome/gutters while inside this world
   *  (SafeArea, overscroll bounce). Mid-stop of the gradient. */
  backgroundColor: string;
  /** Three-stop vertical gradient for this world's slab of the path
   *  canvas, in SCREEN orientation (first stop = top of the slab =
   *  higher ladder positions). Stops are CHAINED across worlds — each
   *  slab's last stop equals the next slab's first stop, so the five
   *  biomes read as one continuous journey with no hard seams. */
  gradientColors: readonly [string, string, string];
  /** Path/connector colour override — picked to contrast against the
   *  gradient without competing with the level-node accent. */
  pathColor: string;
  pathGlow: string;
  /** Tint for the floating particles. */
  particleColor: string;
  particleType: ParticleType;
  /** Saturated theme colour for decorative blobs + world gate pill.
   *  Rendered at very low opacity over the pastel gradient. */
  decoColor: string;
  /** Describes the vibe shown in the intro modal and the gate banner. */
  atmosphere: string;
}

const PATH_WHITE = '#FFFFFF';

// Five distinct pastel biomes. All stops sit in the same lightness
// band as the old flat purple (#E1D2FF) so the white path, white
// glow and node colours keep their contrast everywhere — the hue
// travels, the lightness doesn't. Chain map (screen top → bottom,
// i.e. position 400 → 1):
//   inferno #F5D9CE → #EBDCEF ┐
//   aurora  #EBDCEF → #D7E2F6 ┤ shared boundary stops
//   crystal #D7E2F6 → #DDEEE7 ┤
//   amber   #DDEEE7 → #E9EFDA ┤
//   emerald #E9EFDA → #CFEAD6 ┘
export const WORLD_VISUALS: Record<WorldTheme, WorldVisualConfig> = {
  emerald_grove: {
    backgroundColor: '#D8EEDC',
    gradientColors: ['#E9EFDA', '#D8EEDC', '#CFEAD6'],
    pathColor: PATH_WHITE,
    pathGlow: 'rgba(46, 204, 113, 0.22)',
    particleColor: '#FFFFFF',
    particleType: 'firefly',
    decoColor: '#2ECC71',
    atmosphere: 'A peaceful grove where your journey begins. Trees breathe slow; light filters through the canopy.',
  },
  amber_dunes: {
    backgroundColor: '#F4E8CC',
    gradientColors: ['#DDEEE7', '#F4E8CC', '#E9EFDA'],
    pathColor: PATH_WHITE,
    pathGlow: 'rgba(212, 160, 18, 0.20)',
    particleColor: '#FFF3D6',
    particleType: 'sand',
    decoColor: '#D4A012',
    atmosphere: 'The sands test your endurance. Ancient ruins rise from the dunes; every grain of detail matters.',
  },
  crystal_depths: {
    backgroundColor: '#CFE9F4',
    gradientColors: ['#D7E2F6', '#CFE9F4', '#DDEEE7'],
    pathColor: PATH_WHITE,
    pathGlow: 'rgba(9, 132, 227, 0.18)',
    particleColor: '#EAF6FF',
    particleType: 'bubble',
    decoColor: '#0984E3',
    atmosphere: 'Beneath the surface, coral bridges wind between luminous forms. Hold your breath and read the current.',
  },
  aurora_peaks: {
    backgroundColor: '#DFD8F7',
    gradientColors: ['#EBDCEF', '#DFD8F7', '#D7E2F6'],
    pathColor: PATH_WHITE,
    pathGlow: 'rgba(162, 155, 254, 0.26)',
    particleColor: '#F3EFFF',
    particleType: 'snow',
    decoColor: '#A29BFE',
    atmosphere: 'The cold thins your thoughts. Aurora bands drift across peaks of ice — sharp, quiet, unforgiving.',
  },
  inferno_core: {
    backgroundColor: '#F7E0DC',
    gradientColors: ['#F5D9CE', '#F7E0DC', '#EBDCEF'],
    pathColor: PATH_WHITE,
    pathGlow: 'rgba(255, 107, 107, 0.20)',
    particleColor: '#FFE9E0',
    particleType: 'ember',
    decoColor: '#FF6B6B',
    atmosphere: 'The core burns. Obsidian pillars lean over lava rivers; only the sharpest minds make it through.',
  },
};

/** Brand chrome for the journey tab (buttons, progress fill, current
 *  node highlight). The purple accent is the BLANKED brand accent and
 *  deliberately stays constant across all five biomes; only the
 *  canvas behind the path changes per world. `bg` remains as the
 *  fallback ambient colour for callers that don't know their world. */
export const JOURNEY_PALETTE = {
  bg: '#E1D2FF',
  gradientColors: ['#F2EBFF', '#E1D2FF', '#CDB4FF'] as const,
  pathColor: PATH_WHITE,
  pathGlow: 'rgba(205, 180, 255, 0.4)',
  /** A medium-saturated purple accent used for buttons, the progress
   *  fill, and the highlight on the current level node. */
  accent: '#7C5CE7',
  /** A bolder purple used for primary CTA gradients (Continue card). */
  accentDeep: '#5E4BC9',
} as const;
