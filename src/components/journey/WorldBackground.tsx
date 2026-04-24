import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER } from '@/src/data/unifiedJourney';
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
}

/** Stacks five vertical gradient slabs, one per themed world, matching
 *  the ladder's y-coordinate ranges. Every world gets its own scenery
 *  silhouettes + particle drift so walking from the Grove to the Core
 *  feels cinematic — each environment reads distinct from the moment
 *  it scrolls into view, not just as a colour swatch.
 *
 *  Path is laid out bottom-to-top (Level 1 at the maximum y, final
 *  level at y=pathTopPadding), so each slab's top is anchored to its
 *  HIGHEST position (`end`), not its lowest.
 *
 *  Perf: each WorldParticles instance runs ~14 Reanimated worklets on
 *  the UI thread. With five worlds that's ~70 particles total, well
 *  inside comfortable frame-budget on mid-range Android. Scenery is
 *  static SVG, so it rasterises once and then costs nothing. Viewport
 *  culling on nodes + connectors (in UnifiedJourneyScreen) keeps the
 *  heavy stuff off-screen hidden. */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
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
        const slabHeight = (end - start + 1) * rowHeight;
        const clampedTop = Math.max(0, top);
        const renderHeight = slabHeight + rowHeight;
        return (
          <View
            key={theme}
            style={{
              position: 'absolute',
              top: clampedTop,
              left: 0,
              width,
              height: renderHeight,
              overflow: 'hidden',
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
            <WorldScenery theme={theme} width={width} height={renderHeight} />
            <WorldParticles
              type={visuals.particleType}
              color={visuals.particleColor}
              width={width}
              height={renderHeight}
              density={14}
            />
          </View>
        );
      })}
    </View>
  );
}
