import type { WorldTheme } from '@/src/data/unifiedJourney';

export type ParticleType = 'firefly' | 'sand' | 'bubble' | 'snow' | 'ember';

export interface WorldVisualConfig {
  /** Solid fallback if gradients fail / are not rendered. */
  backgroundColor: string;
  /** Three-stop gradient, top to bottom. Used for the world slab. */
  gradientColors: [string, string, string];
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
    backgroundColor: '#1B4332',
    gradientColors: ['#52B788', '#40916C', '#2D6A4F'],
    pathColor: '#8B7355',
    pathGlow: 'rgba(82, 183, 136, 0.25)',
    particleColor: '#D8F3DC',
    particleType: 'firefly',
    atmosphere: 'A peaceful grove where your journey begins. Trees breathe slow; light filters through the canopy.',
  },
  amber_dunes: {
    backgroundColor: '#7F5539',
    gradientColors: ['#FEFAE0', '#DDA15E', '#BC6C25'],
    pathColor: '#D4A373',
    pathGlow: 'rgba(221, 161, 94, 0.25)',
    particleColor: '#FEFAE0',
    particleType: 'sand',
    atmosphere: 'The sands test your endurance. Ancient ruins rise from the dunes; every grain of detail matters.',
  },
  crystal_depths: {
    backgroundColor: '#03045E',
    gradientColors: ['#48CAE4', '#0096C7', '#023E8A'],
    pathColor: '#90E0EF',
    pathGlow: 'rgba(72, 202, 228, 0.25)',
    particleColor: '#CAF0F8',
    particleType: 'bubble',
    atmosphere: 'Beneath the surface, coral bridges wind between luminous forms. Hold your breath and read the current.',
  },
  aurora_peaks: {
    backgroundColor: '#1B2838',
    gradientColors: ['#A29BFE', '#6C5CE7', '#1B2838'],
    pathColor: '#B8C6DB',
    pathGlow: 'rgba(162, 155, 254, 0.25)',
    particleColor: '#FFFFFF',
    particleType: 'snow',
    atmosphere: 'The cold thins your thoughts. Aurora bands drift across peaks of ice — sharp, quiet, unforgiving.',
  },
  inferno_core: {
    backgroundColor: '#1A0A0A',
    gradientColors: ['#FFBA08', '#E85D04', '#370617'],
    pathColor: '#2B2B2B',
    pathGlow: 'rgba(232, 93, 4, 0.3)',
    particleColor: '#FFBA08',
    particleType: 'ember',
    atmosphere: 'The core burns. Obsidian pillars lean over lava rivers; only the sharpest minds make it through.',
  },
};
