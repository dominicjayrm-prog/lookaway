import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { WorldParticles } from './WorldParticles';
import { BiomeHero } from './BiomeHero';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so gradient slabs line up with node positions. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Gate the heavy stuff (particles + hero) — when false only the
   *  flat gradients render. Lets the parent delay the expensive paint
   *  until after first interaction. */
  showDecorations?: boolean;
  /** Which world is currently in the player's viewport. Particles
   *  only render for THIS world so we have one drift system on screen
   *  at a time instead of all five. */
  viewportWorld?: WorldTheme;
}

/** Height of the hero graphic anchored to the top of each biome slab.
 *  Tall enough to feel like a proper "entry point" when crossing into
 *  a new world, short enough to leave most of the slab as
 *  pure-gradient calm. */
const HERO_HEIGHT = 720;

/** Stacks five vertical biome slabs, one per themed world. Each slab
 *  is a rich 6-stop LinearGradient (sky → mid bands → ground) with a
 *  signature hero graphic at the top edge — sun for Dunes, moon for
 *  Peaks, eruption for Inferno, etc. The body of each slab is intent-
 *  ionally sparse: just the gradient + drifting particles.
 *
 *  Path is laid out bottom-to-top (Level 1 at the maximum y, final
 *  level at y=pathTopPadding), so each slab's top is anchored to its
 *  HIGHEST position (`end`), not its lowest. The hero therefore sits
 *  at the BOUNDARY into the next world up — which is the moment the
 *  player crosses into that biome.
 *
 *  Cross-fade bands at each world boundary use overlapping alpha
 *  gradients so the seam between adjacent biomes melts away.
 *
 *  Perf:
 *  - Zero image decoding (no PNG assets).
 *  - 5 LinearGradient slabs + 4 cross-fade bands + 5 hero SVGs +
 *    1 particle system (current viewport only).
 *  - All static. Whole journey backdrop costs about as much as a
 *    single Image element used to.  */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
  showDecorations = true,
  viewportWorld,
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
            {/* Six-stop gradient — the entire backdrop for this biome.
             *  No image, no tile seams, no decode lag. */}
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

            {/* Hero element — sits at the TOP of each slab, the
             *  threshold where the player crosses into this world.
             *  Doesn't tile, doesn't repeat — just one beautiful
             *  fixed-size graphic per biome. Skipped for the very
             *  first world (Emerald Grove sits at the bottom of the
             *  scroll and players don't 'enter' it — they start
             *  there). */}
            {showDecorations && start > 1 && (
              <BiomeHero hero={visuals.hero} width={width} height={HERO_HEIGHT} />
            )}

            {/* Drift particles — only for the currently-visible world.
             *  Cuts the worklet count from ~70 down to ~18 and the
             *  active drift fades to nothing the moment you scroll
             *  into a different biome. */}
            {showDecorations && isViewportWorld && (
              <WorldParticles
                type={visuals.particleType}
                color={visuals.particleColor}
                width={width}
                height={renderHeight}
                density={18}
              />
            )}
          </View>
        );
      })}

      {/* Cross-fade bands at each world boundary. Two overlaid
       *  gradients per seam — the upper biome's darkest shade fading
       *  downward to transparent, and the lower biome's lightest shade
       *  fading upward from transparent. Where they meet in the middle
       *  they true-alpha-blend. 8 rows tall (~688px) spends real
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
        const bandHeight = rowHeight * 8;
        const bandTop = boundaryY - bandHeight / 2;
        const topDarkest = topVisuals.gradientColors[topVisuals.gradientColors.length - 1];
        const bottomLightest = bottomVisuals.gradientColors[0];
        const topDarkestFaded = topDarkest + '00';
        const bottomLightestFaded = bottomLightest + '00';
        return (
          <React.Fragment key={`seam-${upperTheme}-${lowerTheme}`}>
            <LinearGradient
              colors={[topDarkest, topDarkest, topDarkestFaded]}
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
              colors={[bottomLightestFaded, bottomLightest, bottomLightest]}
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
