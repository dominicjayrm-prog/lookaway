/**
 * Memorise phase: emoji grid fades in, memorise timer ticks down
 * via a thin progress bar at the bottom (subtle, not stressful per
 * spec). When time is up, grid fades out and the parent advances
 * to the recall phase.
 *
 * The grid uses `original` from the WhatChangedConfig — the
 * unchanged layout. Each cell is a soft rounded card matching the
 * Blanked card-style: subtle background tint, generous spacing,
 * rounded corners.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import type { WhatChangedConfig } from './logic';

interface Props {
  config: WhatChangedConfig;
  /** Fires when memorise window has elapsed (after fade-out). */
  onElapsed: () => void;
}

const FADE_OUT_MS = 350;

export function WhatChangedMemoriseView({ config, onElapsed }: Props) {
  const { colors } = useTheme();
  const gridOpacity = useRef(new RNAnimated.Value(0)).current;
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(gridOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration: config.viewSeconds * 1000,
      useNativeDriver: false,
    }).start();
    const fadeAt = setTimeout(() => {
      RNAnimated.timing(gridOpacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }).start();
    }, config.viewSeconds * 1000);
    const doneAt = setTimeout(onElapsed, config.viewSeconds * 1000 + FADE_OUT_MS + 80);
    return () => { clearTimeout(fadeAt); clearTimeout(doneAt); };
  }, [gridOpacity, progressAnim, config.viewSeconds, onElapsed]);

  const a11yLabel = t('daily_challenge.what_changed.memorise_aria', { count: config.original.filter(Boolean).length });

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>
        {t('daily_challenge.what_changed.memorise_instruction')}
      </Text>
      <RNAnimated.View
        style={{ opacity: gridOpacity }}
        accessibilityLabel={a11yLabel}
      >
        <Grid config={config} cells={config.original} />
      </RNAnimated.View>
      <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
        <RNAnimated.View
          style={[
            s.progressFill,
            {
              backgroundColor: colors.accent,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

/** Reusable read-only grid renderer. The recall view passes the
 *  `modified` cells + a tapped-set for the interactive version. */
export function Grid({
  config,
  cells,
  tappedSet,
  onCellPress,
  cellOverlay,
}: {
  config: WhatChangedConfig;
  cells: (string | null)[];
  tappedSet?: Set<number>;
  onCellPress?: (cellIdx: number) => void;
  /** Optional per-cell badge / overlay (used by reveal phase to
   *  show correct / incorrect / missed indicators). */
  cellOverlay?: (cellIdx: number) => React.ReactNode;
}) {
  const { colors } = useTheme();
  const rows = Array.from({ length: config.rows }, (_, r) => r);
  // Each row is a flex row; cells are equal-width via flex: 1.
  return (
    <View style={s.gridWrap}>
      {rows.map((r) => (
        <View key={r} style={s.gridRow}>
          {Array.from({ length: config.cols }, (_, c) => {
            const idx = r * config.cols + c;
            const emoji = cells[idx];
            const tapped = tappedSet?.has(idx) ?? false;
            const Wrapper: any = onCellPress ? PressableCell : InertCell;
            return (
              <Wrapper
                key={c}
                onPress={onCellPress ? () => onCellPress(idx) : undefined}
                tapped={tapped}
                colors={colors}
              >
                {emoji ? (
                  <Text style={s.cellEmoji}>{emoji}</Text>
                ) : (
                  <View style={s.cellEmpty} />
                )}
                {cellOverlay && cellOverlay(idx)}
              </Wrapper>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function PressableCell({ onPress, tapped, colors, children }: { onPress: () => void; tapped: boolean; colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.cell,
        {
          backgroundColor: colors.card,
          borderColor: tapped ? colors.accent : colors.border,
          borderWidth: tapped ? 2.5 : 1,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: tapped }}
    >
      {children}
    </Pressable>
  );
}
function InertCell({ colors, children }: { colors: ReturnType<typeof useTheme>['colors']; children: React.ReactNode }) {
  return (
    <View style={[s.cell, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 16 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  gridWrap: { width: '100%', maxWidth: 360, gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  // Card shadow matches the rest of the daily challenge (Phone Number
  // paper, Names & Faces slots, Witness scene card). Without this the
  // pure-white cells blend into the warm-white page bg and the user
  // perceives the grid as 'empty' even when emojis are rendered —
  // exactly the glitch reported on Wed 29 Apr's What Changed memorise
  // phase. Subtle ('shadowOpacity: 0.06' matches the design system in
  // CLAUDE.md) so it doesn't read as a heavy-handed drop shadow, just
  // enough to delineate each cell from the page.
  //
  // Note: the previous `overflow: 'hidden'` on this style clipped the
  // shadow on iOS (UIView's shadow renders outside the view bounds —
  // overflow:hidden cuts it). The cellEmoji + cellEmpty children
  // never extend past the cell bounds and the reveal-phase overlay
  // respects its own borderRadius, so dropping the clip is safe.
  cell: {
    flex: 1, aspectRatio: 1, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
  },
  cellEmoji: { fontSize: 32, lineHeight: 40 },
  cellEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.06)' },
  progressTrack: { width: '70%', maxWidth: 320, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
