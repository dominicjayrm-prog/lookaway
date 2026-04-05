import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Modal } from 'react-native';

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  spotlights: (SpotlightRect | null)[];
  onComplete: () => void;
}

var STEPS = [
  { title: 'Start here', body: 'This is your current level. Tap Play to jump straight in.', tooltip: 'below' as const, radius: 22 },
  { title: 'Your lives', body: 'You start with 5 lives. Fail a level and you\'ll lose one. They regenerate over time.', tooltip: 'below' as const, radius: 999 },
  { title: 'Gems', body: 'Earn gems by completing levels with stars. Spend them on power-ups in the shop.', tooltip: 'below' as const, radius: 999 },
  { title: 'Your journey', body: 'Explore 6 game modes with 380+ levels. Unlock new modes as you progress.', tooltip: 'above' as const, radius: 14 },
  { title: 'The shop', body: 'Buy power-ups and gem packs. Power-ups help you beat tough levels.', tooltip: 'above' as const, radius: 14 },
];

function TutorialOverlay({ visible, spotlights, onComplete }: Props) {
  var [step, setStep] = useState(0);
  var [showCelebration, setShowCelebration] = useState(false);

  if (!visible) return null;

  var validSpots = spotlights.filter(Boolean) as SpotlightRect[];
  if (validSpots.length < 5) return null;

  var PAD = 10;
  var raw = spotlights[step]!;
  var spot = { x: raw.x - PAD, y: raw.y - PAD, width: raw.width + PAD * 2, height: raw.height + PAD * 2 };
  var info = STEPS[step];
  var sw = Dimensions.get('window').width;
  var sh = Dimensions.get('window').height;
  var isAbove = info.tooltip === 'above';

  function next() {
    if (step >= STEPS.length - 1) {
      setShowCelebration(true);
      setTimeout(() => { setShowCelebration(false); onComplete(); }, 2200);
    } else {
      setStep(s => s + 1);
    }
  }
  function back() { if (step > 0) setStep(s => s - 1); }

  if (showCelebration) {
    return (
      <Modal visible transparent animationType="fade">
        <Pressable style={st.celebOverlay} onPress={onComplete}>
          <View style={st.celebCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83C\uDF89'}</Text>
            <Text style={st.celebTitle}>You're all set!</Text>
            <Text style={st.celebBody}>Tap Play to start your first level. Good luck!</Text>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={st.fullScreen}>
        {/* Top dark rectangle */}
        <View style={[st.dark, { top: 0, left: 0, right: 0, height: Math.max(0, spot.y) }]} />
        {/* Bottom dark rectangle */}
        <View style={[st.dark, { top: spot.y + spot.height, left: 0, right: 0, bottom: 0 }]} />
        {/* Left dark rectangle */}
        <View style={[st.dark, { top: spot.y, left: 0, width: Math.max(0, spot.x), height: spot.height }]} />
        {/* Right dark rectangle */}
        <View style={[st.dark, { top: spot.y, left: spot.x + spot.width, right: 0, height: spot.height }]} />

        {/* Glow border around spotlight */}
        <View style={{
          position: 'absolute',
          left: spot.x - 3, top: spot.y - 3,
          width: spot.width + 6, height: spot.height + 6,
          borderRadius: info.radius + 6,
          borderWidth: 2.5,
          borderColor: 'rgba(162,155,254,0.6)',
        }} />

        {/* Tooltip card — constrained to mobile width */}
        <View style={[st.tooltip, {
          width: Math.min(sw - 40, 340),
          left: Math.max(20, (sw - Math.min(sw - 40, 340)) / 2),
        }, isAbove
          ? { bottom: sh - spot.y + 20 }
          : { top: spot.y + spot.height + 20 }
        ]}>
          {/* Step badge */}
          <View style={st.badge}>
            <Text style={st.badgeText}>{step + 1} OF {STEPS.length}</Text>
          </View>

          <Text style={st.title}>{info.title}</Text>
          <Text style={st.body}>{info.body}</Text>

          {/* Buttons */}
          <View style={st.btnRow}>
            {step === 0 ? (
              <Pressable onPress={onComplete} style={st.ghostBtn}>
                <Text style={st.ghostText}>Skip</Text>
              </Pressable>
            ) : (
              <Pressable onPress={back} style={st.backBtn}>
                <Text style={st.backText}>{'\u2039'} Back</Text>
              </Pressable>
            )}

            <Pressable onPress={next} style={st.nextBtn}>
              <Text style={st.nextText}>{step === STEPS.length - 1 ? "Let's go!" : 'Next'}</Text>
            </Pressable>

            {step > 0 && step < STEPS.length - 1 && (
              <Pressable onPress={onComplete} style={st.ghostBtn}>
                <Text style={st.ghostText}>Skip</Text>
              </Pressable>
            )}
          </View>

          {/* Progress dots */}
          <View style={st.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[st.dot, {
                width: i === step ? 18 : 6,
                backgroundColor: i === step ? '#6C5CE7' : i < step ? '#A29BFE' : '#E0DED8',
              }]} />
            ))}
          </View>
        </View>

        {/* Arrow connecting tooltip to spotlight */}
        <View style={{
          position: 'absolute',
          left: Math.min(sw - 30, Math.max(20, spot.x + spot.width / 2 - 10)),
          top: isAbove ? spot.y - 14 : spot.y + spot.height + 2,
          width: 0, height: 0,
          borderLeftWidth: 10, borderLeftColor: 'transparent',
          borderRightWidth: 10, borderRightColor: 'transparent',
          ...(isAbove
            ? { borderTopWidth: 12, borderTopColor: 'white' }
            : { borderBottomWidth: 12, borderBottomColor: 'white' }),
          zIndex: 201,
        }} />
      </View>
    </Modal>
  );
}

export default TutorialOverlay;

var st = StyleSheet.create({
  fullScreen: { flex: 1 },
  dark: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.65)' },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 30, elevation: 15, zIndex: 200,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108,92,231,0.1)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginBottom: 12,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#6C5CE7', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A18', marginBottom: 6 },
  body: { fontSize: 14, color: '#636E72', lineHeight: 21, marginBottom: 18 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ghostBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  ghostText: { fontSize: 13, fontWeight: '600', color: '#B2BEC3' },
  backBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F5F4F0', borderRadius: 12 },
  backText: { fontSize: 13, fontWeight: '600', color: '#999' },
  nextBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#6C5CE7', alignItems: 'center' },
  nextText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 14 },
  dot: { height: 6, borderRadius: 3 },
  celebOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  celebCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingVertical: 36, paddingHorizontal: 30,
    alignItems: 'center', maxWidth: 300,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 10,
  },
  celebTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A18', marginBottom: 8 },
  celebBody: { fontSize: 14, color: '#636E72', textAlign: 'center', lineHeight: 21 },
});
