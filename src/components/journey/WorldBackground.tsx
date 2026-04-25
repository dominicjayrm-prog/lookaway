import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JOURNEY_PALETTE } from './worldVisuals';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so the gradient fills the entire scrollable
   *  region. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Kept for API compatibility. The journey is one continuous canvas
   *  now and decorations live on the parent screen, not here. */
  showDecorations?: boolean;
}

/** Single pastel-purple backdrop for the entire journey path. No
 *  per-world slabs, no cross-fade bands, no SVG scenery, no particle
 *  systems — those used to differentiate biomes back when the journey
 *  was theme'd, but the design now treats the full ladder as one
 *  unified chill purple canvas.
 *
 *  Renders as one LinearGradient sized to the path container. About
 *  as cheap as a backdrop can get. */
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
        backgroundColor: JOURNEY_PALETTE.bg,
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={JOURNEY_PALETTE.gradientColors}
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
}
