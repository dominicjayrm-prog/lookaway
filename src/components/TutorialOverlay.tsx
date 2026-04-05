import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';

var screen = Dimensions.get('window');

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialStep {
  title: string;
  body: string;
  tooltip: 'above' | 'below';
  borderRadius: number;
}

var STEPS: TutorialStep[] = [
  { title: 'Start here', body: 'This is your current level. Tap Play to jump straight in.', tooltip: 'below', borderRadius: 22 },
  { title: 'Your lives', body: 'You start with 5 lives. Fail a level and you\'ll lose one. They regenerate over time.', tooltip: 'below', borderRadius: 18 },
  { title: 'Gems', body: 'Earn gems by completing levels with stars. Spend them on power-ups in the shop.', tooltip: 'below', borderRadius: 18 },
  { title: 'Your journey', body: 'Explore 6 game modes with 380+ levels. Unlock new modes as you progress.', tooltip: 'above', borderRadius: 14 },
  { title: 'The shop', body: 'Buy power-ups and gem packs. Power-ups help you beat tough levels.', tooltip: 'above', borderRadius: 14 },
];

function padRect(r: SpotlightRect, p = 8): SpotlightRect {
  return { x: r.x - p, y: r.y - p, width: r.width + p * 2, height: r.height + p * 2 };
}

interface Props {
  visible: boolean;
  spotlights: (SpotlightRect | null)[];
  onComplete: () => void;
}

function TutorialOverlay({ visible, spotlights, onComplete }: Props) {
  var [step, setStep] = useState(0);
  var [showCelebration, setShowCelebration] = useState(false);

  if (!visible || spotlights.length < 5 || spotlights.some(s => !s)) return null;

  var spot = padRect(spotlights[step]!);
  var info = STEPS[step];
  var isAbove = info.tooltip === 'above';
  var w = screen.width;
  var h = screen.height;

  function handleNext() {
    if (step >= STEPS.length - 1) {
      setShowCelebration(true);
      setTimeout(() => { setShowCelebration(false); onComplete(); }, 2000);
    } else {
      setStep(s => s + 1);
    }
  }
  function handleBack() { if (step > 0) setStep(s => s - 1); }
  function handleSkip() { onComplete(); }

  if (showCelebration) {
    return (
      <View style={st.celebrationOverlay}>
        <Pressable style={st.celebrationOverlay} onPress={onComplete}>
          <View style={st.celebrationCard}>
            <Text style={st.celebrationEmoji}>{'\uD83C\uDF89'}</Text>
            <Text style={st.celebrationTitle}>You're all set!</Text>
            <Text style={st.celebrationBody}>Tap Play to start your first level. Good luck!</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 4 dark rectangles around the spotlight */}
      <View style={[st.darkRect, { top: 0, left: 0, width: w, height: spot.y }]} />
      <View style={[st.darkRect, { top: spot.y + spot.height, left: 0, width: w, height: h - spot.y - spot.height }]} />
      <View style={[st.darkRect, { top: spot.y, left: 0, width: spot.x, height: spot.height }]} />
      <View style={[st.darkRect, { top: spot.y, left: spot.x + spot.width, width: w - spot.x - spot.width, height: spot.height }]} />

      {/* Glow border */}
      <View style={{
        position: 'absolute',
        left: spot.x - 2, top: spot.y - 2,
        width: spot.width + 4, height: spot.height + 4,
        borderRadius: info.borderRadius + 4,
        borderWidth: 2,
        borderColor: 'rgba(162,155,254,0.5)',
      }} />

      {/* Arrow */}
      <View style={{
        position: 'absolute',
        left: spot.x + spot.width / 2 - 9,
        top: isAbove ? spot.y - 14 : spot.y + spot.height + 2,
        width: 0, height: 0,
        borderLeftWidth: 9, borderLeftColor: 'transparent',
        borderRightWidth: 9, borderRightColor: 'transparent',
        ...(isAbove
          ? { borderTopWidth: 12, borderTopColor: 'white' }
          : { borderBottomWidth: 12, borderBottomColor: 'white' }),
        zIndex: 201,
      }} />

      {/* Tooltip card */}
      <View style={[st.tooltip, isAbove
        ? { bottom: h - spot.y + 16 }
        : { top: spot.y + spot.height + 16 }
      ]}>
        {/* Step badge */}
        <View style={st.stepBadge}>
          <Text style={st.stepBadgeText}>{step + 1} OF {STEPS.length}</Text>
        </View>

        <Text style={st.tooltipTitle}>{info.title}</Text>
        <Text style={st.tooltipBody}>{info.body}</Text>

        {/* Buttons */}
        <View style={st.buttonRow}>
          {step === 0 ? (
            <Pressable onPress={handleSkip} style={st.skipBtn}>
              <Text style={st.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleBack} style={st.backBtn}>
              <Text style={st.backText}>{'\u2039'} Back</Text>
            </Pressable>
          )}

          <Pressable onPress={handleNext} style={st.nextBtn}>
            <Text style={st.nextText}>{step === STEPS.length - 1 ? "Let's go!" : 'Next'}</Text>
          </Pressable>

          {step > 0 && step < STEPS.length - 1 && (
            <Pressable onPress={handleSkip} style={st.skipBtn}>
              <Text style={st.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Progress dots */}
        <View style={st.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[st.dot, {
              width: i === step ? 16 : 6,
              backgroundColor: i === step ? '#6C5CE7' : i < step ? '#A29BFE' : '#E8E6E1',
            }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

export default TutorialOverlay;

var st = StyleSheet.create({
  darkRect: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  tooltip: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: 'white', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10, zIndex: 200,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108,92,231,0.1)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, marginBottom: 10,
  },
  stepBadgeText: { fontSize: 10, fontWeight: '700', color: '#6C5CE7' },
  tooltipTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A18', marginBottom: 4 },
  tooltipBody: { fontSize: 13, color: '#636E72', lineHeight: 20, marginBottom: 16 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  skipText: { fontSize: 13, fontWeight: '600', color: '#B2BEC3' },
  backBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F5F4F0', borderRadius: 10 },
  backText: { fontSize: 13, fontWeight: '600', color: '#B2BEC3' },
  nextBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6C5CE7', alignItems: 'center' },
  nextText: { fontSize: 14, fontWeight: '700', color: 'white' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', zIndex: 300,
  },
  celebrationCard: {
    backgroundColor: 'white', borderRadius: 22,
    padding: 30, alignItems: 'center', maxWidth: 280,
  },
  celebrationEmoji: { fontSize: 32, marginBottom: 10 },
  celebrationTitle: { fontSize: 19, fontWeight: '700', color: '#1A1A18', marginBottom: 6 },
  celebrationBody: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20 },
});
