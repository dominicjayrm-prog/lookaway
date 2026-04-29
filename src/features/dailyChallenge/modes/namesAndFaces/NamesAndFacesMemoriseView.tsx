/**
 * Memorise phase: a 2x2 (Tue, 4 chars) or 3x2 (Sat, 6 chars) grid
 * of Blinks, each in their assigned frame ring with their name in
 * a label underneath. Memorise countdown via a thin progress bar
 * at the bottom of the grid (subtle, not stressful — same
 * pattern as What Changed).
 *
 * The chip row deliberately does NOT exist here — names appear
 * UNDER each Blink in this phase to reinforce the
 * face-attached-to-name binding. The chip row is the recall-phase
 * affordance only.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Blink } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import type { NamesAndFacesConfig } from './logic';

interface Props {
  config: NamesAndFacesConfig;
  /** Fires when memorise window has elapsed (after fade-out).
   *  Parent transitions to the mingle phase. */
  onElapsed: () => void;
}

const FADE_OUT_MS = 320;
/** Pixel size of the Blink itself within the avatar frame. The
 *  frame adds a few pixels for the ring; total cell footprint is
 *  ~95-105px which packs cleanly into both 2x2 and 3x2 layouts on
 *  phone screens. */
const BLINK_SIZE = 80;

export function NamesAndFacesMemoriseView({ config, onElapsed }: Props) {
  const { colors } = useTheme();
  // Start at full opacity — no fade-in. Same iOS layer/text-rasterisation
  // glitch fix as WhatChangedMemoriseView: animating a `useNativeDriver:
  // true` opacity from 0→1 over a parent that contains <Text> can leave
  // the glyphs unrendered for the duration the player needs to memorise.
  // The fade-out stays animated since the text has been composited by
  // then.
  const gridOpacity = useRef(new RNAnimated.Value(1)).current;
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
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

  // Layout: 2 columns by 2 rows (4 chars), or 3 columns by 2 rows
  // (6 chars). Both cleanly fill a phone-width grid without looking
  // sparse or overcrowded.
  const cols = config.numCharacters >= 5 ? 3 : 2;
  const rows: number[][] = [];
  for (let r = 0; r * cols < config.numCharacters; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols && r * cols + c < config.numCharacters; c++) {
      row.push(r * cols + c);
    }
    rows.push(row);
  }

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>
        {t('daily_challenge.names_and_faces.memorise_instruction')}
      </Text>

      <RNAnimated.View
        style={{ opacity: gridOpacity }}
        accessibilityLabel={t('daily_challenge.names_and_faces.memorise_aria', { count: config.numCharacters })}
      >
        <View style={s.gridWrap}>
          {rows.map((row, ri) => (
            <View key={ri} style={s.gridRow}>
              {row.map((idx) => {
                const character = config.characters[idx];
                const frame = getFrameById(character.frame.id) ?? null;
                return (
                  <View key={idx} style={s.cell}>
                    <AvatarFrame frame={frame} size={BLINK_SIZE}>
                      <Blink expression={character.expression} size={BLINK_SIZE} />
                    </AvatarFrame>
                    <Text style={[s.nameLabel, { color: colors.text }]} numberOfLines={1}>
                      {character.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
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

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 16 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  gridWrap: { gap: 18, alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 18 },
  cell: { alignItems: 'center', gap: 10, width: 100 },
  nameLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  progressTrack: { width: '70%', maxWidth: 320, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
