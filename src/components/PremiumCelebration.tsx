/**
 * PremiumCelebration — Cinematic gold celebration when subscribing to Blanked+.
 * 5-second sequence with gold rings, Blink star-eyes, cosmetic previews, confetti.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Dimensions, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Blink } from './Blink';
import { AvatarFrame } from './AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD = '#D4A012';
const GOLD_COLORS = ['#D4A012', '#FDCB6E', '#F9CA24', '#FFD700', '#FFA500', '#FFFFFF'];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

function PremiumCelebrationComponent({ visible, onDismiss }: Props) {
  // Backdrop
  const backdrop = useRef(new RNAnimated.Value(0)).current;
  // Rings (4)
  const rings = useRef(Array.from({ length: 4 }, () => ({
    scale: new RNAnimated.Value(0.05),
    opacity: new RNAnimated.Value(0),
  }))).current;
  // Blink
  const blinkScale = useRef(new RNAnimated.Value(0)).current;
  const shimmer = useRef(new RNAnimated.Value(0)).current;
  // Text
  const titleOpacity = useRef(new RNAnimated.Value(0)).current;
  const subtitleOpacity = useRef(new RNAnimated.Value(0)).current;
  const subtitleScale = useRef(new RNAnimated.Value(0.5)).current;
  // Cosmetic previews (3)
  const previewOpacity = useRef(new RNAnimated.Value(0)).current;
  const previewSlide = useRef(new RNAnimated.Value(30)).current;
  // Unlock text
  const unlockOpacity = useRef(new RNAnimated.Value(0)).current;
  // Button
  const btnOpacity = useRef(new RNAnimated.Value(0)).current;
  const btnSlide = useRef(new RNAnimated.Value(20)).current;
  // Particles (20)
  const particles = useRef(Array.from({ length: 20 }, () => ({
    x: new RNAnimated.Value(0), y: new RNAnimated.Value(0),
    opacity: new RNAnimated.Value(0), scale: new RNAnimated.Value(0),
  }))).current;

  useEffect(() => {
    if (!visible) return;

    // Reset all
    backdrop.setValue(0); blinkScale.setValue(0); shimmer.setValue(0);
    titleOpacity.setValue(0); subtitleOpacity.setValue(0); subtitleScale.setValue(0.5);
    previewOpacity.setValue(0); previewSlide.setValue(30);
    unlockOpacity.setValue(0); btnOpacity.setValue(0); btnSlide.setValue(20);
    rings.forEach(r => { r.scale.setValue(0.05); r.opacity.setValue(0); });
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0); });

    // 1. Backdrop (0-500ms)
    RNAnimated.timing(backdrop, { toValue: 0.92, duration: 500, useNativeDriver: true }).start();

    // 2. Gold rings (300-1800ms)
    rings.forEach((r, i) => {
      setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(r.scale, { toValue: 0.5 + i * 0.15, duration: 1000, useNativeDriver: true }),
          RNAnimated.sequence([
            RNAnimated.timing(r.opacity, { toValue: 0.25, duration: 200, useNativeDriver: true }),
            RNAnimated.timing(r.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]).start();
      }, 300 + i * 250);
    });

    // 3. Blink spring in (1800ms)
    setTimeout(() => {
      RNAnimated.spring(blinkScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
    }, 1800);

    // 4. Gold shimmer pulse (2000ms+)
    setTimeout(() => {
      const loop = () => {
        RNAnimated.sequence([
          RNAnimated.timing(shimmer, { toValue: 0.2, duration: 800, useNativeDriver: true }),
          RNAnimated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start(loop);
      };
      loop();
    }, 2000);

    // 5. Title (2200ms)
    setTimeout(() => {
      RNAnimated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 2200);

    // 6. Subtitle (2400ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(subtitleScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }, 2400);

    // 7. Cosmetic previews (2800ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(previewOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(previewSlide, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
      ]).start();
    }, 2800);

    // 8. Unlock text (3200ms)
    setTimeout(() => {
      RNAnimated.timing(unlockOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 3200);

    // 9. Button (3600ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(btnSlide, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }),
      ]).start();
    }, 3600);

    // 10. Confetti (2000ms)
    setTimeout(() => {
      particles.forEach((p, i) => {
        const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 80 + Math.random() * 120;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 30;
        const delay = Math.random() * 200;
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.parallel([
            RNAnimated.timing(p.x, { toValue: dx, duration: 800, useNativeDriver: true }),
            RNAnimated.timing(p.y, { toValue: dy, duration: 800, useNativeDriver: true }),
            RNAnimated.sequence([
              RNAnimated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
              RNAnimated.delay(400),
              RNAnimated.timing(p.opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]),
            RNAnimated.sequence([
              RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
              RNAnimated.delay(300),
              RNAnimated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }, 2000);
  }, [visible]);

  if (!visible) return null;

  const premiumFrame = getFrameById('frame_premium_gold');

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
    <View style={StyleSheet.absoluteFill}>
      {/* Dark backdrop */}
      <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]} />

      <View style={st.center}>
        {/* Gold expanding rings */}
        {rings.map((r, i) => (
          <RNAnimated.View key={i} style={[st.ring, {
            borderColor: GOLD_COLORS[i % GOLD_COLORS.length],
            opacity: r.opacity,
            transform: [{ scale: r.scale }],
          }]} />
        ))}

        {/* Gold confetti particles */}
        {particles.map((p, i) => (
          <RNAnimated.View key={i} style={[st.particle, {
            backgroundColor: GOLD_COLORS[i % GOLD_COLORS.length],
            width: 8 + Math.random() * 10,
            height: 8 + Math.random() * 10,
            borderRadius: i % 3 === 0 ? 999 : 2,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }]} />
        ))}

        {/* Shimmer glow behind Blink */}
        <RNAnimated.View style={[st.shimmerGlow, { opacity: shimmer }]} />

        {/* Blink with premium expression */}
        <RNAnimated.View style={{ transform: [{ scale: blinkScale }], marginBottom: 16 }}>
          <AvatarFrame frame={premiumFrame ?? null} size={90}>
            <Blink expression="premium" size={90} />
          </AvatarFrame>
        </RNAnimated.View>

        {/* Title */}
        <RNAnimated.View style={{ opacity: titleOpacity }}>
          <Text style={st.welcomeText}>WELCOME TO BLANKED+</Text>
        </RNAnimated.View>

        {/* Subtitle */}
        <RNAnimated.View style={{ opacity: subtitleOpacity, transform: [{ scale: subtitleScale }] }}>
          <Text style={st.premiumText}>Premium</Text>
        </RNAnimated.View>

        {/* 3 cosmetic previews */}
        <RNAnimated.View style={[st.previewRow, { opacity: previewOpacity, transform: [{ translateY: previewSlide }] }]}>
          <View style={st.previewItem}>
            <View style={{ borderWidth: 3, borderColor: GOLD, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Blink expression="normal" size={34} />
            </View>
            <Text style={st.previewLabel}>Gold Frame</Text>
          </View>
          <View style={st.previewItem}>
            <Blink expression="premium" size={44} />
            <Text style={st.previewLabel}>Star Eyes</Text>
          </View>
          <View style={st.previewItem}>
            <LinearGradient colors={['#2D3436', '#D4A012']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 50, height: 24, borderRadius: 6 }} />
            <Text style={st.previewLabel}>Gold Banner</Text>
          </View>
        </RNAnimated.View>

        {/* Unlock text */}
        <RNAnimated.View style={{ opacity: unlockOpacity, marginTop: 12 }}>
          <Text style={st.unlockText}>3 exclusive items unlocked!</Text>
        </RNAnimated.View>

        {/* Button */}
        <RNAnimated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnSlide }], marginTop: 20, width: '100%', maxWidth: 260 }}>
          <Pressable onPress={onDismiss} style={st.btn}>
            <Text style={st.btnText}>Let's go</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </View>
    </Modal>
  );
}

export const PremiumCelebration = React.memo(PremiumCelebrationComponent);

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SW * 1.5, height: SW * 1.5, borderRadius: SW * 0.75, borderWidth: 3 },
  particle: { position: 'absolute' },
  shimmerGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: GOLD },
  welcomeText: { fontSize: 13, fontWeight: '800', color: GOLD, letterSpacing: 4, marginBottom: 4 },
  premiumText: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 20 },
  previewRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  previewItem: { alignItems: 'center', gap: 6 },
  previewLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  unlockText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  btn: { backgroundColor: GOLD, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
