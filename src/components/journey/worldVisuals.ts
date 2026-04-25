import type { WorldTheme } from '@/src/data/unifiedJourney';

export type ParticleType = 'firefly' | 'sand' | 'bubble' | 'snow' | 'ember';

/** Hero element types — one signature graphic anchored to the top of
 *  each biome's slab. Doesn't tile, doesn't stretch — drawn at a fixed
 *  size at the entry point of each world. */
export type HeroElement = 'tree' | 'sun' | 'kelp' | 'moon' | 'eruption';

export interface WorldVisualConfig {
  /** Solid fallback if gradients fail / are not rendered. */
  backgroundColor: string;
  /** Six-stop vertical gradient defining the biome's full atmosphere
   *  from sky/canopy at the top to ground/floor at the bottom. More
   *  stops = richer transitions, especially in the middle bands where
   *  the linear interpolation between only 3 colours used to read as
   *  flat. */
  gradientColors: readonly [string, string, string, string, string, string];
  /** Path/connector colour override — picked to contrast against the
   *  gradient without competing with the level-node accent. */
  pathColor: string;
  pathGlow: string;
  /** Tint for the floating particles. */
  particleColor: string;
  particleType: ParticleType;
  /** Describes the vibe shown in the intro modal and the gate banner. */
  atmosphere: string;
  /** Signature graphic for this biome's entry point. */
  hero: HeroElement;
}

export const WORLD_VISUALS: Record<WorldTheme, WorldVisualConfig> = {
  emerald_grove: {
    backgroundColor: '#0F2A1B',
    // Top → bottom: dawn-yellow filtering through canopy, layers of
    // leaf greens, drop into deep forest shade at the floor.
    gradientColors: ['#B4E5C5', '#7DCE9A', '#52B788', '#40916C', '#2D6A4F', '#0F2A1B'],
    pathColor: '#C9A56B',
    pathGlow: 'rgba(82, 183, 136, 0.25)',
    particleColor: '#FFF6C4',
    particleType: 'firefly',
    atmosphere: 'A peaceful grove where your journey begins. Trees breathe slow; light filters through the canopy.',
    hero: 'tree',
  },
  amber_dunes: {
    backgroundColor: '#3D2817',
    // Top → bottom: cream sky + sun haze, sand-lit warmth, deep dune
    // shadow.
    gradientColors: ['#FFF8DD', '#FEFAE0', '#F2D7A0', '#DDA15E', '#BC6C25', '#3D2817'],
    pathColor: '#D4A373',
    pathGlow: 'rgba(221, 161, 94, 0.3)',
    particleColor: '#FFE8A3',
    particleType: 'sand',
    atmosphere: 'The sands test your endurance. Ancient ruins rise from the dunes; every grain of detail matters.',
    hero: 'sun',
  },
  crystal_depths: {
    backgroundColor: '#001A33',
    // Top → bottom: surface light shimmer, shallow water, mid-depth,
    // descending into the abyss.
    gradientColors: ['#CAF0F8', '#90E0EF', '#48CAE4', '#0096C7', '#023E8A', '#001A33'],
    pathColor: '#CAF0F8',
    pathGlow: 'rgba(72, 202, 228, 0.3)',
    particleColor: '#CAF0F8',
    particleType: 'bubble',
    atmosphere: 'Beneath the surface, coral bridges wind between luminous forms. Hold your breath and read the current.',
    hero: 'kelp',
  },
  aurora_peaks: {
    backgroundColor: '#0B1428',
    // Top → bottom: deep night sky + stars, twilight, aurora purple,
    // mountain shadow, snow drift.
    gradientColors: ['#0B1428', '#1B2838', '#3A4A6B', '#6C5CE7', '#A29BFE', '#E0E8F5'],
    pathColor: '#FFFFFF',
    pathGlow: 'rgba(162, 155, 254, 0.3)',
    particleColor: '#FFFFFF',
    particleType: 'snow',
    atmosphere: 'The cold thins your thoughts. Aurora bands drift across peaks of ice — sharp, quiet, unforgiving.',
    hero: 'moon',
  },
  inferno_core: {
    backgroundColor: '#0A0000',
    // Top → bottom: blazing fire-light sky, ember orange, lava red,
    // blood-deep crimson, into volcanic black at the floor.
    gradientColors: ['#FFE8A3', '#FFCA3A', '#FF8C42', '#E85D04', '#9D0208', '#1A0000'],
    pathColor: '#FFE8A3',
    pathGlow: 'rgba(232, 93, 4, 0.35)',
    particleColor: '#FFE8A3',
    particleType: 'ember',
    atmosphere: 'The core burns. Obsidian pillars lean over lava rivers; only the sharpest minds make it through.',
    hero: 'eruption',
  },
};
