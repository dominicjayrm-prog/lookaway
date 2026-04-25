import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so gradient slabs line up with node positions. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Kept for API compatibility — the bare-bones backdrop is so light
   *  we don't gate anything on it any more. */
  showDecorations?: boolean;
  /** Which world is currently in the player's viewport. Reserved for
   *  future biasing (e.g. spotlight on the current biome). Currently
   *  unused — every world renders identically light. */
  viewportWorld?: WorldTheme;
}

/** Stacks five vertical pastel gradient slabs, one per themed world.
 *  Bare bones: gradient + cross-fade boundary band. No images, no SVG
 *  hero elements, no particles — every additional system is a new way
 *  to crash or jank, so we keep this pure until each layer can be
 *  re-introduced one at a time and verified.
 *
 *  Path is laid out bottom-to-top (Level 1 at the maximum y, final
 *  level at y=pathTopPadding), so each slab's top is anchored to its
 *  HIGHEST position (`end`), not its lowest.
 *
 *  Perf: 5 LinearGradient slabs + 4 cross-fade bands. About as cheap
 *  as a backdrop can get. */
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
              backgroundColor: visuals.backgroundColor,
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
          </View>
        );
      })}

      {/* Cross-fade bands at each world boundary. Two overlaid
       *  gradients per seam — the upper biome's bottom shade fading
       *  downward to transparent, and the lower biome's top shade
       *  fading upward from transparent. They alpha-blend in the
       *  middle for a smooth biome transition. */}
      {WORLD_THEME_ORDER.slice(0, -1).map((upperTheme, i) => {
        const lowerTheme = WORLD_THEME_ORDER[i + 1];
        const upper = WORLD_THEMES[upperTheme];
        const lower = WORLD_THEMES[lowerTheme];
        const topTheme = upper.range[0] > lower.range[0] ? upperTheme : lowerTheme;
        const bottomTheme = topTheme === upperTheme ? lowerTheme : upperTheme;
        const topVisuals = WORLD_VISUALS[topTheme];
        const bottomVisuals = WORLD_VISUALS[bottomTheme];
        const topWorldLowestPos = WORLD_THEMES[topTheme].range[0];
        const boundaryY = pathTopPadding + (totalPositions - topWorldLowestPos + 1) * rowHeight - rowHeight / 2;
        const bandHeight = rowHeight * 8;
        const bandTop = boundaryY - bandHeight / 2;
        const topBottom = topVisuals.gradientColors[topVisuals.gradientColors.length - 1];
        const bottomTop = bottomVisuals.gradientColors[0];
        const topBottomFaded = topBottom + '00';
        const bottomTopFaded = bottomTop + '00';
        return (
          <React.Fragment key={`seam-${upperTheme}-${lowerTheme}`}>
            <LinearGradient
              colors={[topBottom, topBottom, topBottomFaded]}
              locations={[0, 0.18, 1]}
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
            <LinearGradient
              colors={[bottomTopFaded, bottomTop, bottomTop]}
              locations={[0, 0.82, 1]}
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
