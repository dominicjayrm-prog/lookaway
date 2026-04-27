/**
 * First-time tutorial for The Witness, shown ONCE per device via
 * an AsyncStorage flag (`blanked_dc_the_witness_tutorial_seen`).
 * Subsequent plays skip straight from the reveal screen into the
 * read view.
 *
 * Two static example panels: a READ preview showing a tiny snippet
 * of scene prose, and an ANSWER preview showing one example
 * question with the correct option highlighted. The example
 * doesn't reference today's actual scene so the player isn't
 * spoiled.
 *
 * Same pattern as the What Changed and Names & Faces tutorials —
 * keeps the cross-mode tutorial UX consistent.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  onDismiss: () => void;
}

export function WitnessTutorialView({ onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>
        {t('daily_challenge.the_witness.tutorial_title')}
      </Text>
      <Text style={[s.body, { color: colors.textMid }]}>
        {t('daily_challenge.the_witness.tutorial_body')}
      </Text>

      <View style={s.panelsCol}>
        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.accent }]}>
            {t('daily_challenge.the_witness.tutorial_step_read')}
          </Text>
          <View style={[s.snippetCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <Text style={[s.snippetText, { color: colors.text }]}>
              {t('daily_challenge.the_witness.tutorial_example_scene')}
            </Text>
          </View>
        </View>

        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.accent }]}>
            {t('daily_challenge.the_witness.tutorial_step_answer')}
          </Text>
          <View style={[s.questionCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <Text style={[s.questionText, { color: colors.text }]}>
              {t('daily_challenge.the_witness.tutorial_example_question')}
            </Text>
            <View
              style={[
                s.answerPill,
                {
                  backgroundColor: colors.correctSoft,
                  borderColor: colors.correct,
                },
              ]}
            >
              <Text style={[s.answerText, { color: colors.correct }]}>
                {t('daily_challenge.the_witness.tutorial_example_correct')}
              </Text>
              <Text style={[s.answerCheck, { color: colors.correct }]}>✓</Text>
            </View>
          </View>
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
        accessibilityLabel={t('daily_challenge.the_witness.tutorial_dismiss_aria')}
      >
        <Text style={s.btnText}>{t('daily_challenge.the_witness.tutorial_dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  panelsCol: { width: '100%', maxWidth: 360, gap: 14, marginTop: 8, marginBottom: 16 },
  panel: { width: '100%', alignItems: 'center', gap: 8 },
  panelLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  snippetCard: {
    width: '100%', padding: 14, borderRadius: 12,
    shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
    elevation: 1,
  },
  snippetText: {
    fontSize: 14, lineHeight: 22, fontWeight: '400',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  },
  questionCard: {
    width: '100%', padding: 14, borderRadius: 12, gap: 10,
    shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
    elevation: 1,
  },
  questionText: { fontSize: 14, fontWeight: '700' },
  answerPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5,
  },
  answerText: { fontSize: 13, fontWeight: '700' },
  answerCheck: { fontSize: 16, fontWeight: '900' },
  btn: {
    width: '100%', maxWidth: 320,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
