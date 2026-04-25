import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS, WORLD_BIOME_IMAGES } from './worldVisuals';
import { WorldParticles } from './WorldParticles';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so gradient slabs line up with node positions. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Gate the heavy stuff (particles) — when false only the
   *  backdrop images render. Lets the parent delay the expensive paint
   *  until after first interaction. */
  showDecorations?: boolean;
  /** Which world is currently in the player's viewport. Particles only
   *  render for THIS world so we have one drift system on screen at a
   *  time instead of all five. Defaults to all worlds rendering if not
   *  provided (for backwards compat). */
  viewportWorld?: WorldTheme;
}

// Native aspect of the AI-generated biome PNGs (1024 × 1792). Tiles
// render at this ratio so artwork stays undistorted — stretching to
// fit the full ~6500px slab read as a smeared mess.
const IMAGE_ASPECT = 1792 / 1024;

/** Stacks five vertical biome backdrops, one per themed world. Each
 *  slab is filled by tiling the biome PNG vertically at its natural
 *  aspect ratio (no stretch) — the seams between tiles are hidden by
 *  edge-fade gradients that blend the top/bottom 15% of every tile
 *  back to the biome's mid colour. End result: the artwork stays
 *  crisp + recognisable, and you never see a hard repeat line.
 *
 *  Path is laid out bottom-to-top (Level 1 at the maximum y, final
 *  level at y=pathTopPadding), so each slab's top is anchored to its
 *  HIGHEST position (`end`), not its lowest.
 *
 *  Cross-fade bands at each world boundary use overlapping alpha
 *  gradients to blend the seam between adjacent biomes.
 *
 *  Perf: tiles are static <Image> components — iOS / Android both
 *  cache the same source asset across instances, so the per-tile
 *  cost is negligible. Particles are limited to the current viewport
 *  world so we never animate more than ~14 worklets at once. */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
  showDecorations = true,
  viewportWorld,
}: Props) {
  const totalHeight = pathTopPadding + totalPositions * rowHeight + 40;
  const tileHeight = width * IMAGE_ASPECT;

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
        const tileCount = Math.ceil(renderHeight / tileHeight);
        const midColor = visuals.gradientColors[1];
        const midColorTransparent = midColor + '00';
        const isViewportWorld = viewportWorld === theme;
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
              backgroundColor: visuals.backgroundColor,
            }}
          >
            {/* Gradient base — sits behind the image tiles so any
             *  transparency in the artwork still shows biome colour
             *  rather than pure black. */}
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

            {/* Image tiles — full natural aspect, stacked top-to-bottom.
             *  Each tile gets a top + bottom fade overlay so seams
             *  disappear into the biome's mid colour. */}
            {Array.from({ length: tileCount }).map((_, i) => {
              const tileTop = i * tileHeight;
              return (
                <View
                  key={`tile-${i}`}
                  style={{
                    position: 'absolute',
                    top: tileTop,
                    left: 0,
                    width,
                    height: tileHeight,
                  }}
                >
                  <Image
                    source={WORLD_BIOME_IMAGES[theme]}
                    style={{ width, height: tileHeight }}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                  {/* Top edge fade — blends INTO the previous tile.
                   *  Skipped on the first tile so the top of the world
                   *  shows the artwork in full. */}
                  {i > 0 && (
                    <LinearGradient
                      colors={[midColor, midColorTransparent]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: tileHeight * 0.18,
                      }}
                      pointerEvents="none"
                    />
                  )}
                  {/* Bottom edge fade — blends OUT to the next tile.
                   *  Skipped on the last tile because the cross-fade
                   *  band into the next biome handles that boundary. */}
                  {i < tileCount - 1 && (
                    <LinearGradient
                      colors={[midColorTransparent, midColor]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: tileHeight * 0.18,
                      }}
                      pointerEvents="none"
                    />
                  )}
                </View>
              );
            })}

            {/* Particles — only for the currently-visible world. Cuts
             *  the worklet count from 70 down to 14, and the active
             *  drift fades to nothing the moment you scroll out of
             *  this biome. */}
            {showDecorations && isViewportWorld && (
              <WorldParticles
                type={visuals.particleType}
                color={visuals.particleColor}
                width={width}
                height={renderHeight}
                density={14}
              />
            )}
          </View>
        );
      })}

      {/* Cross-fade bands at each world boundary. Two overlaid
       *  gradients per seam — the upper biome's darkest shade fading
       *  downward to transparent, and the lower biome's lightest shade
       *  fading upward from transparent. Where they meet in the middle
       *  they true-alpha-blend. 10 rows tall (~860px) spends real
       *  scroll time in the transition zone. */}
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
        const bandHeight = rowHeight * 10;
        const bandTop = boundaryY - bandHeight / 2;
        const topDarkest = topVisuals.gradientColors[topVisuals.gradientColors.length - 1];
        const bottomLightest = bottomVisuals.gradientColors[0];
        const topDarkestFaded = topDarkest + '00';
        const bottomLightestFaded = bottomLightest + '00';
        return (
          <React.Fragment key={`seam-${upperTheme}-${lowerTheme}`}>
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
