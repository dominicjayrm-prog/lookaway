/**
 * MastermindBlinkUnlock — dramatic full-screen celebration shown when
 * the player completes all 40 levels of Classic World 6 and earns
 * the legendary Mastermind Blink expression (gold sunglasses).
 *
 * Gold confetti, pulsing rings, Boss Blink at 150px, "LEGENDARY
 * UNLOCKED" badge, flavour text, achievement card, and equip CTA.
 */
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Animated as RNAnimated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useGameStore } from '@/src/store';

const GOLD = '#D4A012';
const { width: SW } = Dimensions.get('window');

// ─── Gold confetti ─────────────────────────────────────────────────
const CONFETTI_COLORS = [GOLD, '#FFD700', '#DAA520', '#F5E6C8', '#FFCA28', '#FFF8E1'];

function GoldConfettiParticle({ delay, color, startX, size, duration }: {
  delay: number; color: string; startX: number; size: number; duration: number;
}) {
  const fall = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.timing(fall, { toValue: 1, duration, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, duration, fall]);
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-20, 700] });
  const opacity = fall.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
  return (
    <RNAnimated.View style={{
      position: 'absolute', left: startX, top: 0,
      width: size, height: size * 0.4, borderRadius: 2,
      backgroundColor: color, opacity,
      transform: [{ translateY }, { rotate }],
    }} />
  );
}

function GoldConfetti() {
  const particles = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      startX: 10 + Math.random() * (SW - 40),
      delay: Math.random() * 800 + 800,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 5 + Math.random() * 6,
      duration: 1800 + Math.random() * 1200,
    })),
  ).current;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => <GoldConfettiParticle key={i} {...p} />)}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function MastermindBlinkUnlock({ visible, onDismiss }: Props) {
  const router = useRouter();
  const { isDark, colors } = useTheme();

  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const blinkScale = useRef(new RNAnimated.Value(0.3)).current;
  const blinkOpacity = useRef(new RNAnimated.Value(0)).current;
  const [showText, setShowText] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShowText(false);
    setShowCTA(false);
    backdropAnim.setValue(0);
    blinkScale.setValue(0.3);
    blinkOpacity.setValue(0);

    // Animation timeline
    RNAnimated.timing(backdropAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(blinkScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        RNAnimated.timing(blinkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 600);

    const t1 = setTimeout(() => setShowText(true), 1800);
    const t2 = setTimeout(() => setShowCTA(true), 2400);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible, backdropAnim, blinkScale, blinkOpacity]);

  if (!visible) return null;

  const handleEquip = () => {
    useGameStore.getState().equipCosmetic('expression', 'expr_mastermind');
    onDismiss();
    router.push('/profile');
  };

  const bg = isDark ? '#070510' : '#FAFAF7';
  const textColor = isDark ? '#F0EFF4' : '#1A1A18';
  const textMid = isDark ? '#8E8BA3' : '#636E72';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(212,160,18,0.04)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <RNAnimated.View style={[st.backdrop, { backgroundColor: bg, opacity: backdropAnim }]} />

      <View style={st.container}>
        <GoldConfetti />

        {/* TOP: Badge + Blink */}
        <View style={st.topSection}>
          <View style={[st.badge, { backgroundColor: 'rgba(212,160,18,0.15)' }]}>
            <Text style={st.badgeText}>{t('modals.legendary_unlocked')}</Text>
          </View>

          {/* Glow rings behind Blink */}
          <View style={st.ringContainer}>
            <View style={[st.ring, st.ring3, { borderColor: GOLD + '10' }]} />
            <View style={[st.ring, st.ring2, { borderColor: GOLD + '15' }]} />
            <View style={[st.ring, st.ring1, { borderColor: GOLD + '20' }]} />
          </View>

          <RNAnimated.View style={{
            opacity: blinkOpacity,
            transform: [{ scale: blinkScale }],
          }}>
            <AnimatedBlink expression="mastermind_boss" size={150} breathing />
          </RNAnimated.View>

          <Text style={[st.title, { color: textColor }]}>{t('modals.mastermind_blink')}</Text>
          <View style={[st.subBadge, { backgroundColor: 'rgba(212,160,18,0.12)' }]}>
            <Text style={st.subBadgeText}>{t('modals.legendary_expression')}</Text>
          </View>
        </View>

        {/* MIDDLE: Flavour text + achievement */}
        {showText && (
          <View style={st.middleSection}>
            <Text style={[st.flavourText, { color: textMid }]}>
              You conquered all 40 levels of Mastermind. The gold sunglasses are yours — wear them with pride.
            </Text>
            <View style={[st.achievementCard, { backgroundColor: cardBg }]}>
              <Text style={st.achievementEmoji}>{'\uD83D\uDC51'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[st.achievementTitle, { color: textColor }]}>{t('modals.mastermind_complete')}</Text>
                <Text style={[st.achievementDesc, { color: textMid }]}>Finished Classic World 6 — the hardest world in Blanked</Text>
              </View>
            </View>
          </View>
        )}

        {/* BOTTOM: CTA */}
        {showCTA && (
          <View style={st.bottomSection}>
            <Pressable
              style={[st.equipButton]}
              onPress={handleEquip}
              accessibilityRole="button"
              accessibilityLabel={t('modals.equip_mastermind_aria')}
            >
              <Text style={st.equipText}>{t('modals.equip_mastermind')}</Text>
            </Pressable>
            <Pressable onPress={onDismiss} style={st.dismissBtn}>
              <Text style={[st.dismissText, { color: textMid }]}>{t('modals.maybe_later')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1, justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32,
    alignItems: 'center',
  },

  topSection: { alignItems: 'center' },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, marginBottom: 20 },
  badgeText: { fontSize: 10, fontWeight: '800', color: GOLD, letterSpacing: 1.5 },
  ringContainer: { position: 'absolute', top: 50, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderRadius: 999 },
  ring1: { width: 180, height: 180 },
  ring2: { width: 220, height: 220 },
  ring3: { width: 260, height: 260 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  subBadge: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 6 },
  subBadgeText: { fontSize: 8, fontWeight: '800', color: GOLD, letterSpacing: 1.2 },

  middleSection: { alignItems: 'center', paddingHorizontal: 8 },
  flavourText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  achievementCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, width: '100%',
  },
  achievementEmoji: { fontSize: 24 },
  achievementTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  achievementDesc: { fontSize: 11, lineHeight: 16 },

  bottomSection: { alignItems: 'center', width: '100%' },
  equipButton: {
    width: '100%', paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', backgroundColor: GOLD,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  equipText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  dismissBtn: { paddingVertical: 10 },
  dismissText: { fontSize: 12 },
});
