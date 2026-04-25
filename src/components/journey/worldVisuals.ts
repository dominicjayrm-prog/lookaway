import type { WorldTheme } from '@/src/data/unifiedJourney';

export type ParticleType = 'firefly' | 'sand' | 'bubble' | 'snow' | 'ember';

export interface WorldVisualConfig {
  /** Solid fallback if gradients fail / are not rendered. */
  backgroundColor: string;
  /** Three-stop vertical gradient defining the biome's atmosphere
   *  from sky/canopy at the top to ground/floor at the bottom. Pastel
   *  palette throughout — light + chill + premium. No deep darks. */
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

export const WORLD_VISUALS: Record<WorldTheme, WorldVisualConfig> = {
  emerald_grove: {
    backgroundColor: '#A8E6CF',
    // Soft mint → pale sage → light moss. Light forest, not dark.
    gradientColors: ['#D4F1DE', '#A8E6CF', '#7DCEA0'],
    pathColor: '#C9A56B',
    pathGlow: 'rgba(168, 230, 207, 0.4)',
    particleColor: '#FFFAE0',
    particleType: 'firefly',
    atmosphere: 'A peaceful grove where your journey begins. Trees breathe slow; light filters through the canopy.',
  },
  amber_dunes: {
    backgroundColor: '#FFE5B4',
    // Cream → soft peach → light apricot. Sunlit, gentle.
    gradientColors: ['#FFF5E1', '#FFE5B4', '#F8C99A'],
    pathColor: '#D4A373',
    pathGlow: 'rgba(255, 229, 180, 0.4)',
    particleColor: '#FFF8DD',
    particleType: 'sand',
    atmosphere: 'The sands test your endurance. Ancient ruins rise from the dunes; every grain of detail matters.',
  },
  crystal_depths: {
    backgroundColor: '#B8E5F0',
    // Pale ice blue → soft cyan → light sky blue. Calm water vibes.
    gradientColors: ['#E0F4FA', '#B8E5F0', '#8DD0E0'],
    pathColor: '#FFFFFF',
    pathGlow: 'rgba(184, 229, 240, 0.4)',
    particleColor: '#FFFFFF',
    particleType: 'bubble',
    atmosphere: 'Beneath the surface, coral bridges wind between luminous forms. Hold your breath and read the current.',
  },
  aurora_peaks: {
    backgroundColor: '#D4C5F9',
    // Soft lavender → pale lilac → light periwinkle. Twilight pastel.
    gradientColors: ['#EBDFFF', '#D4C5F9', '#B8A8E8'],
    pathColor: '#FFFFFF',
    pathGlow: 'rgba(212, 197, 249, 0.4)',
    particleColor: '#FFFFFF',
    particleType: 'snow',
    atmosphere: 'The cold thins your thoughts. Aurora bands drift across peaks of ice — sharp, quiet, unforgiving.',
  },
  inferno_core: {
    backgroundColor: '#FFCBA4',
    // Pale peach → soft coral → light salmon. Warm sunset, not lava.
    gradientColors: ['#FFE4D6', '#FFCBA4', '#FFA987'],
    pathColor: '#FFFFFF',
    pathGlow: 'rgba(255, 203, 164, 0.4)',
    particleColor: '#FFF0E0',
    particleType: 'ember',
    atmosphere: 'The core burns. Obsidian pillars lean over lava rivers; only the sharpest minds make it through.',
  },
};
