/**
 * The mingle phase. Brief (~1.7s) cognitive distractor between
 * memorise and recall. Each Blink animates from its memorise grid
 * position to its recall grid position. Names disappear during
 * mingle (no labels visible) so the player has to hold the
 * association in their head while the visual scene rearranges.
 *
 * Animation: each Blink uses a simple translateX/translateY pair
 * driven by RN Animated. We add a slight bezier feel by composing
 * two timing animations with different easings on x vs y so the
 * paths look organic rather than ruler-straight diagonals (a
 * straight diagonal looks like a teleport, an arc reads as
 * movement). Pass-through allowed — z-order doesn't matter for
 * the cognitive distractor; we don't need collision avoidance.
 *
 * Uses RN Animated (not reanimated 4 worklets) for web parity —
 * earlier daily challenge phases hit reanimated-on-web layout
 * issues, this avoids them entirely.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Easing } from 'react-native';
import { Blink } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import type { NamesAndFacesConfig } from './logic';

interface Props {
  config: NamesAndFacesConfig;
  onComplete: () => void;
}

const MINGLE_MS = 1700;
const BLINK_SIZE = 80;
const CELL_SIZE = 100; // memorise cell width; matches NamesAndFacesMemoriseView
const ROW_GAP = 18;

/** Compute the (x, y) pixel offset of a grid cell relative to the
 *  grid's top-left, given the chosen cols layout. Same maths the
 *  memorise + recall views use, so positions line up exactly. */
function cellPosition(idx: number, cols: number): { x: number; y: number } {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const stride = CELL_SIZE + ROW_GAP;
  return { x: c * stride, y: r * stride };
}

export function NamesAndFacesMingle({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const cols = config.numCharacters >= 5 ? 3 : 2;
  const rowCount = Math.ceil(config.numCharacters / cols);
  const gridWidth = cols * CELL_SIZE + (cols - 1) * ROW_GAP;
  const gridHeight = rowCount * CELL_SIZE + (rowCount - 1) * ROW_GAP;

  // For each character (in memorise order) we need its starting
  // position (memorise index) and its ending position (where the
  // recall view will display it). recallOrder[j] = character index
  // appearing in slot j of the recall grid. So the destination
  // slot for memorise-index i is recallOrder.indexOf(i).
  const transitions = useMemo(() => {
    return config.characters.map((char, memoriseIdx) => {
      const recallSlot = config.recallOrder.indexOf(memoriseIdx);
      const start = cellPosition(memoriseIdx, cols);
      const end = cellPosition(recallSlot, cols);
      return { char, start, end };
    });
  }, [config, cols]);

  // One pair of Animated.Values per Blink for the translateX +
  // translateY tweens. Stored in a ref so re-renders don't reset
  // them mid-animation.
  const animsRef = useRef(transitions.map(({ start }) => ({
    x: new RNAnimated.Value(start.x),
    y: new RNAnimated.Value(start.y),
  })));

  useEffect(() => {
    // Start every Blink's tween simultaneously. X eases out
    // (decelerates into final position) while Y eases in-out
    // (accelerates then decelerates) — the easing mismatch creates
    // the "arc" feeling without needing a real bezier path.
    const animations = transitions.map(({ end }, i) => RNAnimated.parallel([
      RNAnimated.timing(animsRef.current[i].x, {
        toValue: end.x,
        duration: MINGLE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      RNAnimated.timing(animsRef.current[i].y, {
        toValue: end.y,
        duration: MINGLE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]));
    RNAnimated.parallel(animations).start();
    const done = setTimeout(onComplete, MINGLE_MS + 80);
    return () => clearTimeout(done);
  }, [transitions, onComplete]);

  return (
    <View style={s.root}>
      <Text style={[s.caption, { color: colors.textMid }]}>
        {t('daily_challenge.names_and_faces.mingle_caption')}
      </Text>
      <View style={[s.stage, { width: gridWidth, height: gridHeight }]}>
        {transitions.map(({ char }, i) => {
          const frame = getFrameById(char.frame.id) ?? null;
          return (
            <RNAnimated.View
              key={i}
              style={[
                s.movingBlink,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  transform: [
                    { translateX: animsRef.current[i].x },
                    { translateY: animsRef.current[i].y },
                  ],
                },
              ]}
            >
              <AvatarFrame frame={frame} size={BLINK_SIZE}>
                <Blink expression={char.expression} size={BLINK_SIZE} />
              </AvatarFrame>
            </RNAnimated.View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 16 },
  caption: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  // The stage is a fixed-size box that hosts the absolute-positioned
  // moving Blinks. Sizing it to the grid bounds means the layout
  // doesn't reflow as Blinks translate around inside.
  stage: { position: 'relative' },
  movingBlink: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
