/**
 * First-time tutorial for What Changed?, shown ONCE per device via
 * an AsyncStorage flag (`blanked_dc_what_changed_tutorial_seen`).
 * Subsequent plays skip straight from the reveal screen into the
 * memorise phase.
 *
 * Two illustrative example panels: a "before" mini-grid and an
 * "after" mini-grid with a coloured ring around the changed cell.
 * Static panels (not animated) so the player can study them at
 * their own pace. "Got it" dismiss button.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  onDismiss: () => void;
}

// Hand-picked tiny example. 3x3, single change (swap apple -> orange
// in middle-right cell). Doesn't reference any current-day puzzle
// to avoid spoiling whatever the player is about to play.
const EXAMPLE_BEFORE: (string | null)[] = [
  '🐶', null, '🌳',
  '🍎', '⚽', '🍎',
  null, '🚗', null,
];
const EXAMPLE_AFTER: (string | null)[] = [
  '🐶', null, '🌳',
  '🍎', '⚽', '🍊',
  null, '🚗', null,
];
const CHANGED_CELL_INDEX = 5; // middle-right

export function WhatChangedTutorialView({ onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>
        {t('daily_challenge.what_changed.tutorial_title')}
      </Text>
      <Text style={[s.body, { color: colors.textMid }]}>
        {t('daily_challenge.what_changed.tutorial_body')}
      </Text>

      <View style={s.panelsRow}>
        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.textMid }]}>
            {t('daily_challenge.what_changed.tutorial_before')}
          </Text>
          <MiniGrid cells={EXAMPLE_BEFORE} />
        </View>
        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.textMid }]}>
            {t('daily_challenge.what_changed.tutorial_after')}
          </Text>
          <MiniGrid cells={EXAMPLE_AFTER} highlightIndex={CHANGED_CELL_INDEX} />
        </View>
      </View>

      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [
          s.btn,
          { backgroundColor: colors.accent },
          pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('daily_challenge.what_changed.tutorial_dismiss_aria')}
      >
        <Text style={s.btnText}>{t('daily_challenge.what_changed.tutorial_dismiss')}</Text>
      </Pressable>
    </View>
  );
}

function MiniGrid({ cells, highlightIndex }: { cells: (string | null)[]; highlightIndex?: number }) {
  const { colors } = useTheme();
  return (
    <View style={s.miniGridWrap}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={s.miniRow}>
          {[0, 1, 2].map((c) => {
            const idx = r * 3 + c;
            const emoji = cells[idx];
            const isHighlight = idx === highlightIndex;
            return (
              <View
                key={c}
                style={[
                  s.miniCell,
                  { backgroundColor: colors.card, borderColor: isHighlight ? colors.accent : colors.border, borderWidth: isHighlight ? 2.5 : 1 },
                ]}
              >
                {emoji ? <Text style={s.miniEmoji}>{emoji}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  panelsRow: { flexDirection: 'row', gap: 14, marginTop: 8, marginBottom: 16, width: '100%', maxWidth: 360, justifyContent: 'center' },
  panel: { flex: 1, alignItems: 'center', gap: 6 },
  panelLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  miniGridWrap: { gap: 4 },
  miniRow: { flexDirection: 'row', gap: 4 },
  miniCell: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  miniEmoji: { fontSize: 20 },
  btn: {
    width: '100%', maxWidth: 320,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
