import React from 'react';
import { View } from 'react-native';
import { JOURNEY_PALETTE } from './worldVisuals';

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so the fill covers the entire scrollable
   *  region. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Kept for API compatibility. */
  showDecorations?: boolean;
}

/** Single flat pastel-purple backdrop for the entire journey path.
 *  No gradient, no per-world slabs, no scenery, no particles. The
 *  flat fill matches the SafeAreaView + ScrollView container colour
 *  so the top safe-area, the path, and the bottom gutter all read as
 *  one continuous unbroken colour — no horizontal seams. */
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
    />
  );
}
