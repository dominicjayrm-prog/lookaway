import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER } from '@/src/data/unifiedJourney';
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
}

/** Stacks five vertical biome backdrops, one per themed world,
 *  matching the ladder's y-coordinate ranges. Each backdrop is an AI-
 *  generated PNG (1024×1792) stretched to fill the full ~6500px world
 *  slab. Sits on top of the world's gradient so the colour stays
 *  intact even if the image fails to load.
 *
 *  Path is laid out bottom-to-top (Level 1 at the maximum y, final
 *  level at y=pathTopPadding), so each slab's top is anchored to its
 *  HIGHEST position (`end`), not its lowest.
 *
 *  Cross-fade bands at each world boundary use overlapping alpha
 *  gradients to blend the seam between adjacent biomes — without
 *  them you'd see a hard horizontal cut where one PNG meets the next.
 *
 *  Perf: a single Image element per slab + 5 light particle systems.
 *  Way cheaper than the previous SVG scenery (which used to render
 *  hundreds of paths per biome). */
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
              backgroundColor: visuals.backgroundColor,
            }}
          >
            {/* Gradient base — kept as a fallback in case the image
             *  fails to load, and to bias the colour at the edges
             *  where the cross-fade bands blend. */}
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
            {/* Biome backdrop image — stretched to fill the slab.
             *  resizeMode 'stretch' deliberately distorts the 9:16
             *  source to fit the tall slab; the AI artwork was
             *  designed with that in mind (atmospheric, no perfect
             *  circles in focal positions). */}
            <Image
              source={WORLD_BIOME_IMAGES[theme]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width,
                height: renderHeight,
              }}
              resizeMode="stretch"
              fadeDuration={0}
            />
            {showDecorations && (
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
       *  they true-alpha-blend, so the scroll passes through real
       *  biome colour at every y-position. 10 rows tall (~860px)
       *  spends real scroll time in the transition zone. */}
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
        // 8-digit hex with alpha 00 keeps the transparent stop on the
        // SAME hue as the opaque one — generic 'transparent' would
        // mud through neutral grey.
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
