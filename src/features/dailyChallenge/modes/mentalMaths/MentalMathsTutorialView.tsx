/**
 * First-time tutorial for Mental Tally, shown ONCE per device via an
 * AsyncStorage flag (`blanked_dc_mental_maths_tutorial_seen`).
 * Subsequent plays skip straight from the reveal screen into the
 * game.
 *
 * A static worked example (numbers → running total) plus a heads-up
 * about the round-3 minus twist. Static panels so the player studies
 * at their own pace; "Got it" dismiss button. Mirrors the What
 * Changed tutorial pattern.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  onDismiss: () => void;
}

// Hand-picked tiny example — deliberately NOT derived from today's
// puzzle so it can't spoil the real numbers.
const EXAMPLE_VALUES = ['4', '9', '2'];
const EXAMPLE_TOTAL = '15';

export function MentalMathsTutorialView({ onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>
        {t('daily_challenge.mental_maths.tutorial_title')}
      </Text>
      <Text style={[s.body, { color: colors.textMid }]}>
        {t('daily_challenge.mental_maths.tutorial_body')}
      </Text>

      {/* Worked example: the three numbers as they'd flash, an arrow,
          and the total the player would key in. */}
      <View style={s.exampleRow}>
        {EXAMPLE_VALUES.map((v, i) => (
          <React.Fragment key={i}>
            <View style={[s.exampleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.exampleNumber, { color: colors.text }]}>{v}</Text>
            </View>
            {i < EXAMPLE_VALUES.length - 1 && (
              <Text style={[s.examplePlus, { color: colors.textLight }]}>+</Text>
            )}
          </React.Fragment>
        ))}
        <Ionicons name="arrow-forward" size={18} color={colors.textMid} style={{ marginHorizontal: 4 }} />
        <View style={[s.exampleCard, s.exampleTotalCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <Text style={[s.exampleNumber, { color: colors.accent }]}>{EXAMPLE_TOTAL}</Text>
        </View>
      </View>
      <Text style={[s.exampleCaption, { color: colors.textLight }]}>
        {t('daily_challenge.mental_maths.tutorial_example_caption')}
      </Text>

      {/* The minus heads-up — the mode's signature twist deserves a
          warning so round 3 reads as clever, not unfair. */}
      <View style={[s.minusCallout, { backgroundColor: colors.wrongSoft }]}>
        <Text style={s.minusIcon}>➖</Text>
        <Text style={[s.minusText, { color: colors.textMid }]}>
          {t('daily_challenge.mental_maths.tutorial_minus_hint')}
        </Text>
      </View>

      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [
          s.btn,
          { backgroundColor: colors.accent },
          pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('daily_challenge.mental_maths.tutorial_dismiss_aria')}
      >
        <Text style={s.btnText}>{t('daily_challenge.mental_maths.tutorial_dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  exampleCard: {
    width: 46, height: 56, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  exampleTotalCard: { width: 56 },
  exampleNumber: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  examplePlus: { fontSize: 18, fontWeight: '700' },
  exampleCaption: { fontSize: 12, textAlign: 'center' },
  minusCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: 340, marginTop: 4, marginBottom: 10,
  },
  minusIcon: { fontSize: 16 },
  minusText: { flex: 1, fontSize: 13, lineHeight: 18 },
  btn: {
    width: '100%', maxWidth: 320,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
