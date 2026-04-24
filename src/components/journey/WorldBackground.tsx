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
  /** Gate the heavy stuff (scenery + particles) — when false, only
   *  the gradient slabs + transition bands render. Lets the parent
   *  delay the expensive paint until after first interaction so the
   *  tab opens instantly on slower devices. */
  showDecorations?: boolean;
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
  showDecorations = true,
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
            {showDecorations && (
              <>
                <WorldScenery theme={theme} width={width} height={renderHeight} />
                <WorldParticles
                  type={visuals.particleType}
                  color={visuals.particleColor}
                  width={width}
                  height={renderHeight}
                  density={14}
                />
              </>
            )}
          </View>
        );
      })}

      {/* Cross-fade bands at each world boundary. Two overlaid
       *  gradients per seam — the upper biome's darkest shade fading
       *  downward to transparent, and the lower biome's lightest shade
       *  fading upward from transparent. Because both have transparent
       *  mid-stops, they meet in the middle as a true alpha crossfade
       *  rather than a single gradient's sharp colour flip. The band
       *  is 10 rows tall (~860px), which is roughly a screen's worth
       *  of vertical space — so you spend real scroll time in the
       *  transition zone, not just a few frames. */}
      {WORLD_THEME_ORDER.slice(0, -1).map((upperTheme, i) => {
        const lowerTheme = WORLD_THEME_ORDER[i + 1];
        const upper = WORLD_THEMES[upperTheme];
        const lower = WORLD_THEMES[lowerTheme];
        // In the flipped layout the world with the HIGHER position
        // range sits at the top of the canvas.
        const topTheme = upper.range[0] > lower.range[0] ? upperTheme : lowerTheme;
        const bottomTheme = topTheme === upperTheme ? lowerTheme : upperTheme;
        const topVisuals = WORLD_VISUALS[topTheme];
        const bottomVisuals = WORLD_VISUALS[bottomTheme];
        const topWorldLowestPos = WORLD_THEMES[topTheme].range[0];
        const boundaryY = pathTopPadding + (totalPositions - topWorldLowestPos + 1) * rowHeight - rowHeight / 2;
        const bandHeight = rowHeight * 10;
        const bandTop = boundaryY - bandHeight / 2;
        const topDarkest = topVisuals.gradientColors[topVisuals.gradientColors.length - 1];
        const bottomLightest = bottomVisuals.gradientColors[0];
        // Transparent versions for the fade-out edges — expo-linear-
        // gradient accepts 8-digit hex (#RRGGBBAA) so the transparent
        // stop stays the SAME hue as the opaque one. If we just used
        // a generic 'transparent' the gradient would fade through a
        // neutral grey which looks muddy.
        const topDarkestFaded = topDarkest + '00';
        const bottomLightestFaded = bottomLightest + '00';
        return (
          <React.Fragment key={`seam-${upperTheme}-${lowerTheme}`}>
            {/* Upper biome dark colour fading downward to transparent */}
            <LinearGradient
              colors={[topDarkest, topDarkest, topDarkestFaded]}
              locations={[0, 0.15, 1]}
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
            {/* Lower biome light colour fading upward from transparent */}
            <LinearGradient
              colors={[bottomLightestFaded, bottomLightest, bottomLightest]}
              locations={[0, 0.85, 1]}
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
          </React.Fragment>
        );
      })}
    </View>
  );
}
