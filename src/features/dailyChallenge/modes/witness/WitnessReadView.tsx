/**
 * Read phase for The Witness.
 *
 * Renders the scene prose on a soft white card with generous
 * line-height and a serif-leaning style so it reads like a novel
 * page rather than a UI screen. Below the card sits a 35-second
 * "suggested reading time" progress bar that fills quietly and
 * keeps going past 100% in a muted state if the player wants more
 * time. There is no auto-advance — the player taps Continue when
 * they're done.
 *
 * Time tracking: from view mount to Continue tap. The container
 * receives this as the `timeSeconds` field, used only for tiebreak
 * purposes (since this mode is not speed-graded).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated as RNAnimated, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { sounds } from '@/src/lib/sounds';
import { activeWitnessLocale, type WitnessConfig } from './logic';

interface Props {
  config: WitnessConfig;
  /** Fired when the player taps Continue. The view does not
   *  auto-advance; an unbounded read is part of the mode brief. */
  onContinue: (elapsedSeconds: number) => void;
}

const isWeb = Platform.OS === 'web';
const SOFT_PROGRESS_OVERFLOW_AT = 1.0; // bar reaches 100% at recommended seconds
const SOFT_PROGRESS_OVERFLOW_TO = 1.4; // overflow region settles here

export function WitnessReadView({ config, onContinue }: Props) {
  const { colors } = useTheme();
  const startedAt = useRef<number>(Date.now());
  const locale = activeWitnessLocale();

  // Soft progress bar — animates from 0 to 1 over recommendedReadSeconds,
  // then continues filling beyond 1 (capped at SOFT_PROGRESS_OVERFLOW_TO)
  // in a muted tone so slow readers see they're past the suggestion
  // without being shamed for taking longer. Uses two chained
  // Animated.timing runs so the actual animation runs on the JS
  // thread once and then drives the interpolations natively, instead
  // of a setInterval that calls setValue() every 200ms.
  const progress = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const totalMs = config.recommendedReadSeconds * 1000;
    const inWindow = RNAnimated.timing(progress, {
      toValue: SOFT_PROGRESS_OVERFLOW_AT,
      duration: totalMs,
      useNativeDriver: false,
    });
    const overflow = RNAnimated.timing(progress, {
      toValue: SOFT_PROGRESS_OVERFLOW_TO,
      // Settle into the overflow zone over twice the suggested time
      // so it stays subtle for slow readers but still visibly
      // progressing past the recommendation.
      duration: totalMs * 2,
      useNativeDriver: false,
    });
    const seq = RNAnimated.sequence([inWindow, overflow]);
    seq.start();
    return () => seq.stop();
  }, [config.recommendedReadSeconds, progress]);

  const handleContinue = useCallback(() => {
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    sounds.play('whoosh');
    const elapsedSeconds = +((Date.now() - startedAt.current) / 1000).toFixed(2);
    onContinue(elapsedSeconds);
  }, [onContinue]);

  const sceneText = useMemo(() => config.scene[locale], [config, locale]);
  const titleText = useMemo(() => config.title[locale], [config, locale]);

  // Width of the bar's filled segment as a percentage. Past 100% the
  // bar locks at 100% but the colour shifts so the player can see
  // they're past the suggestion (handled via `pastTime` flag below).
  const barWidth = progress.interpolate({
    inputRange: [0, SOFT_PROGRESS_OVERFLOW_AT, 1.4],
    outputRange: ['0%', '100%', '100%'],
    extrapolate: 'clamp',
  });
  // Tone of the bar — accent purple while inside the suggested
  // window, soft mid-grey afterwards. Gives a visual hand-off
  // between "on pace" and "taking your time" without alarming.
  const barColor = progress.interpolate({
    inputRange: [0, SOFT_PROGRESS_OVERFLOW_AT, SOFT_PROGRESS_OVERFLOW_AT + 0.001, 1.4],
    outputRange: [colors.accent, colors.accent, colors.textLight, colors.textLight],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.root}>
      <Text style={[s.titleEyebrow, { color: colors.accent }]}>
        {t('daily_challenge.the_witness.read_caption').toUpperCase()}
      </Text>
      <Text style={[s.title, { color: colors.text }]}>{titleText}</Text>

      <ScrollView
        style={s.sceneScroll}
        contentContainerStyle={s.sceneContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.sceneCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
          <Text style={[s.sceneText, { color: colors.text }]}>{sceneText}</Text>
        </View>
      </ScrollView>

      <View style={s.bottomWrap}>
        <View style={[s.progressTrack, { backgroundColor: colors.surface }]}>
          <RNAnimated.View
            style={[
              s.progressFill,
              { width: barWidth, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={[s.progressLabel, { color: colors.textLight }]}>
          {t('daily_challenge.the_witness.read_progress_label')}
        </Text>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            s.continueBtn,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.the_witness.read_continue_aria')}
        >
          <Text style={s.continueText}>
            {t('daily_challenge.the_witness.read_continue')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  titleEyebrow: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26, fontWeight: '900', letterSpacing: -0.4,
    marginBottom: 4,
  },
  sceneScroll: { flex: 1 },
  sceneContent: { paddingBottom: 8 },
  sceneCard: {
    padding: 22, borderRadius: 18,
    shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14,
    elevation: 2,
  },
  sceneText: {
    fontSize: 17, lineHeight: 28, fontWeight: '400',
    // Slight letter-spacing makes the prose feel less clinical and
    // more like a printed page; combined with the larger line-height
    // it stops the reader from speed-skimming.
    letterSpacing: 0.15,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  },
  bottomWrap: { gap: 8, paddingBottom: 4 },
  progressTrack: {
    height: 6, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 6, borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  continueBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
