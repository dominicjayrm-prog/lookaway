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

      {/* Cross-fade bands at each world boundary. Without these the
       *  slab gradients' bottom stop (darkest) meets the next slab's
       *  top stop (lightest) as a hard seam. The band is ~3 rows tall
       *  and sits centred on the boundary y, gradient-filled from the
       *  upper world's darkest shade at the TOP to the lower world's
       *  lightest shade at the BOTTOM. Reads as a natural dissolve. */}
      {WORLD_THEME_ORDER.slice(0, -1).map((upperTheme, i) => {
        // In the flipped layout, the upper world (higher positions)
        // sits above the lower world. upperTheme is the earlier entry
        // in the array — check their ranges to know which is which.
        const lowerTheme = WORLD_THEME_ORDER[i + 1];
        const upper = WORLD_THEMES[upperTheme];
        const lower = WORLD_THEMES[lowerTheme];
        // The "seam" is between the upper world's lowest position
        // (start) and the lower world's highest position (end). In
        // flipped coords these collide at the same y; we centre the
        // band on the midpoint.
        // Figure out which theme has the HIGHER position range (that's
        // the one at the TOP of the canvas).
        const topTheme = upper.range[0] > lower.range[0] ? upperTheme : lowerTheme;
        const bottomTheme = topTheme === upperTheme ? lowerTheme : upperTheme;
        const topVisuals = WORLD_VISUALS[topTheme];
        const bottomVisuals = WORLD_VISUALS[bottomTheme];
        // The boundary y: the border between the two worlds lies at
        // the y of the lower-of-the-two start positions. Take the
        // smallest start of the pair (which for consecutive worlds is
        // the start of the TOP-of-canvas world's range... actually
        // just compute it directly from position).
        const topWorldLowestPos = WORLD_THEMES[topTheme].range[0];
        const boundaryY = pathTopPadding + (totalPositions - topWorldLowestPos + 1) * rowHeight - rowHeight / 2;
        const bandHeight = rowHeight * 3;
        const bandTop = boundaryY - bandHeight / 2;
        return (
          <LinearGradient
            key={`seam-${upperTheme}-${lowerTheme}`}
            colors={[
              topVisuals.gradientColors[topVisuals.gradientColors.length - 1],
              bottomVisuals.gradientColors[0],
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              top: bandTop,
              left: 0,
              width,
              height: bandHeight,
            }}
            pointerEvents="none"
          />
        );
      })}
    </View>
  );
}
