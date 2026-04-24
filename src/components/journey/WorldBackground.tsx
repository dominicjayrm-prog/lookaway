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
  /** The world the player is currently in (derived from unified
   *  position). We render scenery + particles ONLY for this world and
   *  leave the other four as flat gradients. This cuts what would
   *  otherwise be 5 huge SVG trees + 80 simultaneous particle
   *  animations down to 1 + ~12 — the single biggest perf win on
   *  the Journey tab. Scenery/particles fade-in/out as the player
   *  crosses a world boundary. */
  currentWorld: WorldTheme;
}

/** Stacks five vertical gradient slabs, one per themed world, matching
 *  the ladder's y-coordinate ranges. Only the CURRENT world slab
 *  renders its scenery + particles — the rest stay quiet solid
 *  gradients so we don't stack dozens of SVG layers into a single
 *  scrollview. */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
  currentWorld,
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
        const top = pathTopPadding + (start - 1) * rowHeight - rowHeight / 2;
        const slabHeight = (end - start + 1) * rowHeight;
        const clampedTop = Math.max(0, top);
        const isCurrent = theme === currentWorld;
        return (
          <View
            key={theme}
            style={{
              position: 'absolute',
              top: clampedTop,
              left: 0,
              width,
              height: slabHeight + rowHeight,
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
            {isCurrent && (
              <>
                <WorldScenery theme={theme} width={width} height={slabHeight + rowHeight} />
                <WorldParticles
                  type={visuals.particleType}
                  color={visuals.particleColor}
                  width={width}
                  height={slabHeight + rowHeight}
                  density={12}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}
