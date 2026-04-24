import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { WorldParticles } from './WorldParticles';
import { WorldScenery } from './WorldScenery';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so gradient slabs line up with node positions. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** The world the player is currently in. Kept for future biasing
   *  (e.g. bumping particle density for the active world) but every
   *  world now renders its own scenery + particles so the whole
   *  journey feels alive as you scroll through it. */
  currentWorld: WorldTheme;
}

/** Stacks five vertical gradient slabs — one per themed world — each
 *  with its own scenery layer + drifting particle system. Because the
 *  path is rendered bottom-up (Level 1 at the bottom, final level at
 *  the top) the slab positioning mirrors that: a world's range [start,
 *  end] maps to `top = padding + (total - end) * rowHeight`, which
 *  places higher-numbered levels near the top of the canvas.
 *
 *  Perf: each WorldParticles instance runs ~12 Reanimated worklets on
 *  the UI thread. With five worlds that's ~60 particles total, well
 *  inside comfortable frame-budget on mid-range Android. Scenery is
 *  static SVG, so it rasterises once and then costs nothing. Viewport
 *  culling on nodes + connectors (in UnifiedJourneyScreen) keeps the
 *  heavy stuff off-screen hidden. */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
  currentWorld: _currentWorld,
}: Props) {
  const totalHeight = pathTopPadding + totalPositions * rowHeight + 40;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height: totalHeight,
      }}
      pointerEvents="none"
    >
      {WORLD_THEME_ORDER.map((theme) => {
        const meta = WORLD_THEMES[theme];
        const visuals = WORLD_VISUALS[theme];
        const [start, end] = meta.range;
        // Top of this world's slab in the flipped layout: the highest
        // position number (end) sits closest to the top of the canvas,
        // so `top` is based on `end`. We extend half a rowHeight above
        // and below so the gradient bleeds gracefully into neighbours
        // rather than leaving a hard seam.
        const top = pathTopPadding + (totalPositions - end) * rowHeight - rowHeight / 2;
        const slabHeight = (end - start + 1) * rowHeight + rowHeight;
        const clampedTop = Math.max(0, top);
        return (
          <View
            key={theme}
            style={{
              position: 'absolute',
              top: clampedTop,
              left: 0,
              width,
              height: slabHeight,
            }}
          >
            <LinearGradient
              colors={visuals.gradientColors}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <WorldScenery theme={theme} width={width} height={slabHeight} />
            <WorldParticles
              type={visuals.particleType}
              color={visuals.particleColor}
              width={width}
              height={slabHeight}
              density={12}
            />
          </View>
        );
      })}
    </View>
  );
}
