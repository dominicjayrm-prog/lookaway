/**
 * First-time tutorial for Names & Faces, shown ONCE per device via
 * an AsyncStorage flag (`blanked_dc_names_and_faces_tutorial_seen`).
 * Subsequent plays go straight from reveal into memorise.
 *
 * Two static example panels: a MEMORISE preview showing two mini
 * Blinks each labelled with a name, and a MATCH preview showing
 * the same two Blinks shuffled with name chips below. Doesn't
 * reference today's actual puzzle so the player isn't spoiled.
 *
 * Same layout pattern as the What Changed tutorial — keeps the
 * tutorial UX consistent across modes.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Blink } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  onDismiss: () => void;
}

// Two static example characters used by both the MEMORISE and
// MATCH panels. Pinned (not generated) so the tutorial doesn't
// accidentally spoil the day's actual puzzle.
const EXAMPLE_A = { expression: 'wink' as const, frameId: 'frame_blink_normal', name: 'Sarah' };
const EXAMPLE_B = { expression: 'pirate' as const, frameId: 'frame_coral', name: 'Diego' };

export function NamesAndFacesTutorialView({ onDismiss }: Props) {
  const { colors } = useTheme();
  const frameA = getFrameById(EXAMPLE_A.frameId) ?? null;
  const frameB = getFrameById(EXAMPLE_B.frameId) ?? null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Text style={[s.title, { color: colors.text }]}>
        {t('daily_challenge.names_and_faces.tutorial_title')}
      </Text>
      <Text style={[s.body, { color: colors.textMid }]}>
        {t('daily_challenge.names_and_faces.tutorial_body')}
      </Text>

      <View style={s.panelsCol}>
        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.accent }]}>
            {t('daily_challenge.names_and_faces.tutorial_step_memorise')}
          </Text>
          <View style={s.examplePair}>
            <View style={s.exampleCell}>
              <AvatarFrame frame={frameA} size={56}>
                <Blink expression={EXAMPLE_A.expression} size={56} />
              </AvatarFrame>
              <Text style={[s.exampleName, { color: colors.text }]}>{EXAMPLE_A.name}</Text>
            </View>
            <View style={s.exampleCell}>
              <AvatarFrame frame={frameB} size={56}>
                <Blink expression={EXAMPLE_B.expression} size={56} />
              </AvatarFrame>
              <Text style={[s.exampleName, { color: colors.text }]}>{EXAMPLE_B.name}</Text>
            </View>
          </View>
        </View>

        <View style={s.panel}>
          <Text style={[s.panelLabel, { color: colors.accent }]}>
            {t('daily_challenge.names_and_faces.tutorial_step_recall')}
          </Text>
          {/* Show the same two Blinks but reversed (shuffled), with
              name chips below — captures the mechanic visually. */}
          <View style={s.examplePair}>
            <View style={s.exampleCell}>
              <AvatarFrame frame={frameB} size={56}>
                <Blink expression={EXAMPLE_B.expression} size={56} />
              </AvatarFrame>
            </View>
            <View style={s.exampleCell}>
              <AvatarFrame frame={frameA} size={56}>
                <Blink expression={EXAMPLE_A.expression} size={56} />
              </AvatarFrame>
            </View>
          </View>
          <View style={s.tutorialChipRow}>
            {[EXAMPLE_A.name, EXAMPLE_B.name].map((n) => (
              <View
                key={n}
                style={[s.tutorialChip, { backgroundColor: colors.card, borderColor: colors.accent }]}
              >
                <Text style={[s.tutorialChipText, { color: colors.text }]}>{n}</Text>
              </View>
            ))}
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
        accessibilityLabel={t('daily_challenge.names_and_faces.tutorial_dismiss_aria')}
      >
        <Text style={s.btnText}>{t('daily_challenge.names_and_faces.tutorial_dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  panelsCol: { width: '100%', maxWidth: 360, gap: 14, marginTop: 8, marginBottom: 16 },
  panel: { alignItems: 'center', gap: 10 },
  panelLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  examplePair: { flexDirection: 'row', gap: 24 },
  exampleCell: { alignItems: 'center', gap: 6 },
  exampleName: { fontSize: 13, fontWeight: '700' },
  tutorialChipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tutorialChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  tutorialChipText: { fontSize: 12, fontWeight: '700' },
  btn: {
    width: '100%', maxWidth: 320,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
