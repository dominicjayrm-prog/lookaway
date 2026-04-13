/**
 * ModeUnlockCelebration — full-screen modal shown when a player
 * unlocks a new game mode by completing a qualifying world.
 *
 * Animations:
 *  - Dark overlay fades in (0.4s)
 *  - Card springs in from scale 0.9 → 1.0 (0.5s, spring with overshoot)
 *  - 20 confetti particles rain from top (varied colours/sizes/speeds)
 *  - Brain benefit pills stagger in at 0.7s
 *  - Science stat fades in at 0.9s
 *  - World/level count fades in at 1.1s
 *
 * No Blink mascot on this modal — the mode letter icon is the hero.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MODE_UNLOCK_DATA, type ModeUnlockInfo } from '@/src/data/modeUnlocks';

const { width: SW } = Dimensions.get('window');

interface Props {
  visible: boolean;
  modeId: string;
  onDismiss: () => void;
}

// ─── Confetti particles ────────────────────────────────────────────

const CONFETTI_COLORS = ['#6C5CE7', '#FF6B6B', '#00B894', '#D4A012', '#0984E3', '#FD79A8', '#00CEC9'];

function ConfettiParticle({ delay, color, startX, size, duration }: {
  delay: number; color: string; startX: number; size: number; duration: number;
}) {
  const fall = useRef(new RNAnimated.Value(0)).current;
  const spin = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(fall, { toValue: 1, duration, useNativeDriver: true }),
        RNAnimated.timing(spin, { toValue: 1, duration, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, duration, fall, spin]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-20, 650] });
  const opacity = fall.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <RNAnimated.View
      style={{
        position: 'absolute', left: startX, top: 0,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate }],
      }}
    />
  );
}

function ConfettiRain() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      startX: 20 + Math.random() * (SW - 80),
      delay: Math.random() * 600,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 4 + Math.random() * 5,
      duration: 1500 + Math.random() * 1000,
    })),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} />
      ))}
    </View>
  );
}

// ─── Main modal ────────────────────────────────────────────────────

export function ModeUnlockCelebration({ visible, modeId, onDismiss }: Props) {
  const router = useRouter();
  const mode = MODE_UNLOCK_DATA[modeId];

  // Animation values
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardScale = useRef(new RNAnimated.Value(0.9)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const [showPills, setShowPills] = useState(false);
  const [showStat, setShowStat] = useState(false);
  const [showCounts, setShowCounts] = useState(false);

  useEffect(() => {
    if (visible && mode) {
      setShowPills(false);
      setShowStat(false);
      setShowCounts(false);
      backdropOpacity.setValue(0);
      cardScale.setValue(0.9);
      cardOpacity.setValue(0);

      RNAnimated.parallel([
        RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(cardScale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        RNAnimated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const t1 = setTimeout(() => setShowPills(true), 700);
      const t2 = setTimeout(() => setShowStat(true), 900);
      const t3 = setTimeout(() => setShowCounts(true), 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [visible, mode, backdropOpacity, cardScale, cardOpacity]);

  if (!visible || !mode) return null;

  const handleLetsGo = () => {
    onDismiss();
    router.push('/(tabs)/journey');
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      {/* Dark backdrop */}
      <RNAnimated.View style={[st.backdrop, { opacity: backdropOpacity }]} />

      <View style={st.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <RNAnimated.View style={[
          st.card,
          { transform: [{ scale: cardScale }], opacity: cardOpacity },
        ]}>
          <ConfettiRain />

          {/* Coloured header */}
          <View style={[st.header, { backgroundColor: mode.color }]}>
            {/* Decorative circle */}
            <View style={st.headerCircle} />

            <View style={st.badge}>
              <Text style={st.badgeText}>NEW MODE UNLOCKED</Text>
            </View>

            <View style={st.letterCircle}>
              <Text style={st.letterText}>{mode.letter}</Text>
            </View>

            <Text style={st.modeName}>{mode.name}</Text>
            <Text style={st.tagline}>{mode.tagline}</Text>
          </View>

          {/* Content */}
          <View style={st.content}>
            <Text style={st.description}>{mode.description}</Text>

            {/* Brain benefit pills */}
            <View style={[st.pillsRow, { opacity: showPills ? 1 : 0 }]}>
              {mode.trains.map((t) => (
                <View key={t} style={[st.pill, { backgroundColor: mode.color + '08' }]}>
                  <Text style={[st.pillText, { color: mode.color }]}>{t}</Text>
                </View>
              ))}
            </View>

            {/* Science stat */}
            <View style={[st.statBox, { opacity: showStat ? 1 : 0 }]}>
              <Text style={st.statEmoji}>{'\uD83E\uDDE0'}</Text>
              <Text style={st.statText}>{mode.stat}</Text>
            </View>

            {/* World + level count */}
            <View style={[st.countsRow, { opacity: showCounts ? 1 : 0 }]}>
              <View style={st.countItem}>
                <Text style={[st.countNumber, { color: mode.color }]}>{mode.worlds}</Text>
                <Text style={st.countLabel}>Worlds</Text>
              </View>
              <View style={st.countItem}>
                <Text style={[st.countNumber, { color: mode.color }]}>{mode.levels}</Text>
                <Text style={st.countLabel}>Levels</Text>
              </View>
            </View>

            {/* CTA */}
            <Pressable
              style={[st.ctaButton, { backgroundColor: mode.color }]}
              onPress={handleLetsGo}
              accessibilityRole="button"
              accessibilityLabel={`Start playing ${mode.name}`}
            >
              <Text style={st.ctaText}>Let's Go!</Text>
            </Pressable>

            <Pressable
              onPress={onDismiss}
              style={st.dismissBtn}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Text style={st.dismissText}>Maybe later</Text>
            </Pressable>
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2, shadowRadius: 48, elevation: 20,
  },

  // Header
  header: { padding: 28, paddingBottom: 22, alignItems: 'center' },
  headerCircle: {
    position: 'absolute', right: -10, top: -10,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },
  letterCircle: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  letterText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  modeName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Content
  content: { padding: 16, paddingTop: 16, paddingBottom: 20, zIndex: 2 },
  description: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, marginBottom: 14 },

  pillsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 10, fontWeight: '600' },

  statBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    padding: 8, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: 'rgba(0,184,148,0.06)', marginBottom: 14,
  },
  statEmoji: { fontSize: 11, flexShrink: 0 },
  statText: { fontSize: 10, color: '#00B894', fontWeight: '500', lineHeight: 14 },

  countsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 },
  countItem: { alignItems: 'center' },
  countNumber: { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 9, color: '#B2BEC3' },

  ctaButton: { paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  ctaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  dismissBtn: { paddingVertical: 8, alignItems: 'center' },
  dismissText: { fontSize: 11, color: '#B2BEC3' },
});
