import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Modal, Animated as RNAnimated } from 'react-native';
import Svg, { Circle as SvgCircle, Polygon } from 'react-native-svg';

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

/** Premium celebration screen — expanding rings, floating stars, spring text */
function CelebrationScreen({ onDismiss }: { onDismiss: () => void }) {
  var sw = Dimensions.get('window').width;
  var sh = Dimensions.get('window').height;
  var cx = sw / 2;
  var cy = sh * 0.38;

  // Backdrop fade
  var backdropAnim = useRef(new RNAnimated.Value(0)).current;
  // 3 expanding rings
  var ring1 = useRef(new RNAnimated.Value(0)).current;
  var ring2 = useRef(new RNAnimated.Value(0)).current;
  var ring3 = useRef(new RNAnimated.Value(0)).current;
  // Card entrance
  var cardScale = useRef(new RNAnimated.Value(0)).current;
  var cardOpacity = useRef(new RNAnimated.Value(0)).current;
  // Icon bounce
  var iconScale = useRef(new RNAnimated.Value(0)).current;
  // Floating particles (stars + dots)
  var particles = useRef(
    Array.from({ length: 14 }, () => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
      angle: Math.random() * Math.PI * 2,
      distance: 60 + Math.random() * 120,
      size: 6 + Math.random() * 12,
      color: ['#6C5CE7', '#A29BFE', '#D4A012', '#00B894', '#FF6B6B', '#0984E3'][Math.floor(Math.random() * 6)],
      isStar: Math.random() > 0.5,
      delay: Math.random() * 400,
    }))
  ).current;
  // Subtitle fade
  var subtitleOpacity = useRef(new RNAnimated.Value(0)).current;
  // Button slide up
  var btnY = useRef(new RNAnimated.Value(30)).current;
  var btnOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    // Backdrop
    RNAnimated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();

    // Rings burst outward with stagger
    [ring1, ring2, ring3].forEach((r, i) => {
      RNAnimated.sequence([
        RNAnimated.delay(200 + i * 150),
        RNAnimated.timing(r, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]).start();
    });

    // Icon pops in with spring
    RNAnimated.sequence([
      RNAnimated.delay(300),
      RNAnimated.spring(iconScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: false }),
    ]).start();

    // Card scales in
    RNAnimated.sequence([
      RNAnimated.delay(500),
      RNAnimated.spring(cardScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
    ]).start();
    RNAnimated.sequence([
      RNAnimated.delay(450),
      RNAnimated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();

    // Particles burst outward
    particles.forEach((p) => {
      var dx = Math.cos(p.angle) * p.distance;
      var dy = Math.sin(p.angle) * p.distance;
      RNAnimated.sequence([
        RNAnimated.delay(400 + p.delay),
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: dx, duration: 700, useNativeDriver: false }),
          RNAnimated.timing(p.y, { toValue: dy - 40, duration: 700, useNativeDriver: false }),
          RNAnimated.sequence([
            RNAnimated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
            RNAnimated.delay(300),
            RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          RNAnimated.sequence([
            RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: false }),
            RNAnimated.delay(200),
            RNAnimated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
        ]),
      ]).start();
    });

    // Subtitle fades in
    RNAnimated.sequence([
      RNAnimated.delay(900),
      RNAnimated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();

    // Button slides up
    RNAnimated.sequence([
      RNAnimated.delay(1100),
      RNAnimated.parallel([
        RNAnimated.spring(btnY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: false }),
        RNAnimated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
    ]).start();
  }, []);

  var maxRingSize = Math.max(sw, sh) * 0.9;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark backdrop */}
      <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(10,10,30,0)', 'rgba(10,10,30,0.85)'] }) }]} />

      {/* Expanding rings */}
      {[ring1, ring2, ring3].map((r, i) => (
        <RNAnimated.View key={i} style={{
          position: 'absolute',
          left: cx - maxRingSize / 2,
          top: cy - maxRingSize / 2,
          width: maxRingSize,
          height: maxRingSize,
          borderRadius: maxRingSize / 2,
          borderWidth: 2,
          borderColor: '#6C5CE7',
          opacity: r.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.3 - i * 0.08, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.6 + i * 0.25] }) }],
        }} />
      ))}

      {/* Floating particles */}
      {particles.map((p, i) => (
        <RNAnimated.View key={i} style={{
          position: 'absolute', left: cx - p.size / 2, top: cy - p.size / 2,
          width: p.size, height: p.size,
          opacity: p.opacity,
          transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }, { rotate: `${p.angle * 180 / Math.PI}deg` }],
        }}>
          {p.isStar ? (
            <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
              <Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={p.color} />
            </Svg>
          ) : (
            <View style={{ width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color }} />
          )}
        </RNAnimated.View>
      ))}

      {/* Center icon — eye/brain icon with glow */}
      <RNAnimated.View style={{
        position: 'absolute', left: cx - 36, top: cy - 36,
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: '#6C5CE7',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30,
        transform: [{ scale: iconScale }],
      }}>
        <Svg width={36} height={36} viewBox="0 0 24 24">
          <SvgCircle cx={12} cy={12} r={4} fill="white" />
          <Polygon points="12,5 14,9.5 12,8 10,9.5" fill="white" opacity={0.6} />
          <Polygon points="12,19 14,14.5 12,16 10,14.5" fill="white" opacity={0.6} />
          <Polygon points="5,12 9.5,10 8,12 9.5,14" fill="white" opacity={0.6} />
          <Polygon points="19,12 14.5,10 16,12 14.5,14" fill="white" opacity={0.6} />
        </Svg>
      </RNAnimated.View>

      {/* Card */}
      <RNAnimated.View style={{
        position: 'absolute', left: Math.max(20, (sw - 300) / 2), right: Math.max(20, (sw - 300) / 2),
        top: cy + 55,
        alignItems: 'center',
        opacity: cardOpacity,
        transform: [{ scale: cardScale }],
      }}>
        <Text style={st.celebTitle}>You're all set!</Text>
        <RNAnimated.View style={{ opacity: subtitleOpacity }}>
          <Text style={st.celebBody}>Your memory journey starts now.{'\n'}Let's see what you can remember.</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnY }], width: '100%', maxWidth: 280, marginTop: 28 }}>
          <Pressable style={st.celebBtn} onPress={onDismiss}>
            <Text style={st.celebBtnText}>Let's play</Text>
          </Pressable>
        </RNAnimated.View>
      </RNAnimated.View>
    </View>
  );
}

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
        <CelebrationScreen onDismiss={onComplete} />
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
  celebTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 10, textAlign: 'center', letterSpacing: -0.5 },
  celebBody: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  celebBtn: {
    backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  celebBtnText: { fontSize: 17, fontWeight: '800', color: '#6C5CE7' },
});
