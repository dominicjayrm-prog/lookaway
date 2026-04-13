/**
 * MilestoneGiftCelebration — premium full-screen celebration shown
 * when a player earns (or retroactively claims) a milestone cosmetic.
 *
 * Two-phase animation:
 *   Phase 1 (0-1.5s): Gift box appears, wobbles, then "opens" (scales up + fades)
 *   Phase 2 (1.5s+): The cosmetic name + rarity + preview fade in with
 *     gold confetti and a "Claimed!" badge
 *
 * Triggered from:
 *   - Tapping a gift icon on the world map (retroactive claim)
 *   - Completing a milestone level for the first time
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Animated as RNAnimated, Dimensions,
} from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { RARITY_COLORS } from '@/src/data/cosmetics';
import { GiftIcon } from './GiftIcon';

const { width: SW } = Dimensions.get('window');
const GOLD = '#D4A012';
const CONFETTI_COLORS = [GOLD, '#FFD700', '#DAA520', '#6C5CE7', '#FF6B6B', '#00B894', '#0984E3'];

// ─── Confetti ──────────────────────────────────────────────────────
function ConfettiParticle({ delay, color, startX, size, duration }: {
  delay: number; color: string; startX: number; size: number; duration: number;
}) {
  const fall = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.timing(fall, { toValue: 1, duration, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, duration, fall]);
  return (
    <RNAnimated.View style={{
      position: 'absolute', left: startX, top: 0,
      width: size, height: size * 0.5, borderRadius: 2,
      backgroundColor: color,
      opacity: fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-10, 600] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
      ],
    }} />
  );
}

function Confetti() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      startX: 15 + Math.random() * (SW - 50),
      delay: 1400 + Math.random() * 400,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 5 + Math.random() * 5,
      duration: 1600 + Math.random() * 800,
    })),
  ).current;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => <ConfettiParticle key={i} {...p} />)}
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  itemName: string;
  rarity: string;
  category: string;
  onDismiss: () => void;
}

export function MilestoneGiftCelebration({ visible, itemName, rarity, category, onDismiss }: Props) {
  const { colors, isDark } = useTheme();

  // Phase 1: gift box
  const giftScale = useRef(new RNAnimated.Value(0)).current;
  const giftWobble = useRef(new RNAnimated.Value(0)).current;
  const giftOpacity = useRef(new RNAnimated.Value(0)).current;

  // Phase 2: reveal
  const [showReveal, setShowReveal] = useState(false);
  const revealOpacity = useRef(new RNAnimated.Value(0)).current;
  const revealScale = useRef(new RNAnimated.Value(0.8)).current;

  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setShowReveal(false);
    giftScale.setValue(0);
    giftWobble.setValue(0);
    giftOpacity.setValue(0);
    revealOpacity.setValue(0);
    revealScale.setValue(0.8);
    backdropOpacity.setValue(0);

    // Phase 1: gift appears + wobbles
    RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(giftScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        RNAnimated.timing(giftOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        // Wobble
        RNAnimated.sequence([
          RNAnimated.timing(giftWobble, { toValue: 1, duration: 100, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: -1, duration: 100, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: 0, duration: 80, useNativeDriver: true }),
        ]).start();
      });
    }, 200);

    // Phase 2: gift "opens" → reveal
    const t = setTimeout(() => {
      RNAnimated.timing(giftOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      RNAnimated.timing(giftScale, { toValue: 1.5, duration: 200, useNativeDriver: true }).start();

      setTimeout(() => {
        setShowReveal(true);
        RNAnimated.parallel([
          RNAnimated.spring(revealScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
          RNAnimated.timing(revealOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 200);
    }, 1500);

    return () => clearTimeout(t);
  }, [visible, giftScale, giftWobble, giftOpacity, revealOpacity, revealScale, backdropOpacity]);

  if (!visible) return null;

  const rarityColor = RARITY_COLORS[rarity] ?? '#636E72';
  const bg = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <RNAnimated.View style={[st.backdrop, { backgroundColor: bg, opacity: backdropOpacity }]} />
      <Pressable style={st.container} onPress={showReveal ? onDismiss : undefined}>
        <Confetti />

        {/* Phase 1: Gift box */}
        {!showReveal && (
          <RNAnimated.View style={{
            opacity: giftOpacity,
            transform: [
              { scale: giftScale },
              { rotate: giftWobble.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] }) },
            ],
          }}>
            <GiftIcon size={80} />
          </RNAnimated.View>
        )}

        {/* Phase 2: Reveal */}
        {showReveal && (
          <RNAnimated.View style={[st.revealCard, {
            backgroundColor: isDark ? '#1A1929' : '#FFFFFF',
            opacity: revealOpacity,
            transform: [{ scale: revealScale }],
          }]}>
            {/* Gold sparkle ring */}
            <View style={[st.sparkleRing, { borderColor: GOLD + '20' }]} />

            <View style={[st.claimedBadge, { backgroundColor: GOLD + '15' }]}>
              <Text style={st.claimedText}>{'\uD83C\uDF81'} CLAIMED!</Text>
            </View>

            <Text style={[st.itemName, { color: colors.text }]}>{itemName}</Text>

            <View style={[st.rarityBadge, { backgroundColor: rarityColor + '15' }]}>
              <Text style={[st.rarityText, { color: rarityColor }]}>
                {rarity.toUpperCase()} {category.toUpperCase()}
              </Text>
            </View>

            <Text style={[st.flavour, { color: colors.textMid }]}>
              Added to your collection. Equip it from your profile!
            </Text>

            <Pressable
              style={[st.doneButton, { backgroundColor: GOLD }]}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={st.doneText}>Awesome!</Text>
            </Pressable>
          </RNAnimated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  revealCard: {
    width: '100%', maxWidth: 340, borderRadius: 24, padding: 28,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 32, elevation: 16,
  },
  sparkleRing: {
    position: 'absolute', top: -30, width: 200, height: 200,
    borderRadius: 100, borderWidth: 2,
    alignSelf: 'center',
  },

  claimedBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, marginBottom: 16 },
  claimedText: { fontSize: 12, fontWeight: '800', color: GOLD, letterSpacing: 1.2 },

  itemName: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },

  rarityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 16 },
  rarityText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  flavour: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  doneButton: {
    width: '100%', paddingVertical: 14, borderRadius: 13, alignItems: 'center',
    shadowColor: GOLD, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  doneText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
