/**
 * MilestoneGiftCelebration — premium full-screen celebration shown
 * when a player earns (or retroactively claims) a milestone cosmetic.
 *
 * Three-phase animation:
 *   Phase 1 (0-1.2s): Gift box springs in, wobbles
 *   Phase 2 (1.2-2s): Lid pops off (flies up + rotates), cosmetic name
 *     peeks out of the box with a golden glow
 *   Phase 3 (2s+): Reveal card with confetti, item name, rarity, CTA
 */
import React
import { t } from '@/src/i18n';, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { RARITY_COLORS, getExpressionById, getFrameById, getBannerById } from '@/src/data/cosmetics';
import { Blink } from './Blink';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SH } = Dimensions.get('window');
const GOLD = '#D4A012';
const CONFETTI_COLORS = [GOLD, '#FFD700', '#DAA520', '#6C5CE7', '#FF6B6B', '#00B894', '#0984E3'];

// ─── Confetti (contained within modal bounds) ──────────────────────
function ConfettiParticle({ delay, color, startPct, size, duration }: {
  delay: number; color: string; startPct: number; size: number; duration: number;
}) {
  const fall = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.timing(fall, { toValue: 1, duration, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, duration, fall]);
  const maxFall = SH * 0.7;
  return (
    <RNAnimated.View style={{
      position: 'absolute', left: `${startPct}%` as any, top: 0,
      width: size, height: size * 0.5, borderRadius: 2,
      backgroundColor: color,
      opacity: fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-10, maxFall] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
      ],
    }} />
  );
}

function Confetti() {
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      startPct: 5 + Math.random() * 90,
      delay: 1800 + Math.random() * 400,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 4 + Math.random() * 4,
      duration: 1400 + Math.random() * 600,
    })),
  ).current;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {particles.map((p, i) => <ConfettiParticle key={i} {...p} />)}
    </View>
  );
}

// ─── Split gift: box (bottom) + lid (top) ──────────────────────────
function GiftBox({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 24 14">
      <Rect x={3} y={0} width={18} height={12} rx={2} fill="#6C5CE7" />
      <Rect x={10.5} y={0} width={3} height={12} fill={GOLD} />
      <Rect x={3} y={4} width={18} height={2} fill={GOLD} opacity={0.4} />
    </Svg>
  );
}

function GiftLid({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.45} viewBox="0 0 24 10">
      <Rect x={1.5} y={3} width={21} height={5.5} rx={1.5} fill="#7E6EE8" />
      <Rect x={1.5} y={4.5} width={21} height={2} fill={GOLD} />
      <Circle cx={12} cy={2.5} r={2.8} fill={GOLD} />
    </Svg>
  );
}

// ─── Main ──────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  itemId: string;
  itemName: string;
  rarity: string;
  category: string;
  onDismiss: () => void;
}

/** Renders a visual preview of the cosmetic based on its type. */
function CosmeticPreview({ itemId, category, size = 80 }: { itemId: string; category: string; size?: number }) {
  if (category === 'expression') {
    const expr = getExpressionById(itemId);
    const blinkExpr = expr?.blinkExpression ?? 'normal';
    return (
      <View style={{ width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, backgroundColor: 'rgba(108,92,231,0.08)', alignItems: 'center', justifyContent: 'center' }}>
        <Blink expression={blinkExpr} size={size} />
      </View>
    );
  }
  if (category === 'frame') {
    const frame = getFrameById(itemId);
    const borderColor = frame?.borderColor ?? '#6C5CE7';
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor,
        backgroundColor: 'rgba(108,92,231,0.06)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Blink expression="normal" size={size - 16} />
      </View>
    );
  }
  if (category === 'banner') {
    const banner = getBannerById(itemId);
    const gradientColors = banner?.gradientColors ?? ['#6C5CE7', '#A29BFE'];
    return (
      <LinearGradient
        colors={gradientColors as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size * 1.8, height: size * 0.5, borderRadius: 12 }}
      />
    );
  }
  return null;
}

export function MilestoneGiftCelebration({ visible, itemId, itemName, rarity, category, onDismiss }: Props) {
  const { colors, isDark } = useTheme();

  // Phase 1: gift box
  const giftScale = useRef(new RNAnimated.Value(0)).current;
  const giftWobble = useRef(new RNAnimated.Value(0)).current;
  const giftOpacity = useRef(new RNAnimated.Value(0)).current;

  // Phase 2: lid pops off
  const lidY = useRef(new RNAnimated.Value(0)).current;
  const lidRotate = useRef(new RNAnimated.Value(0)).current;
  const lidOpacity = useRef(new RNAnimated.Value(1)).current;
  const [showPeek, setShowPeek] = useState(false);
  const peekOpacity = useRef(new RNAnimated.Value(0)).current;

  // Phase 3: reveal card
  const [showReveal, setShowReveal] = useState(false);
  const revealOpacity = useRef(new RNAnimated.Value(0)).current;
  const revealScale = useRef(new RNAnimated.Value(0.8)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setShowReveal(false);
    setShowPeek(false);
    giftScale.setValue(0); giftWobble.setValue(0); giftOpacity.setValue(0);
    lidY.setValue(0); lidRotate.setValue(0); lidOpacity.setValue(1);
    peekOpacity.setValue(0);
    revealOpacity.setValue(0); revealScale.setValue(0.8);
    backdropOpacity.setValue(0);

    // Phase 1: gift appears + wobbles
    RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const t1 = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(giftScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        RNAnimated.timing(giftOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        RNAnimated.sequence([
          RNAnimated.timing(giftWobble, { toValue: 1, duration: 100, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: -1, duration: 100, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          RNAnimated.timing(giftWobble, { toValue: 0, duration: 80, useNativeDriver: true }),
        ]).start();
      });
    }, 200);

    // Phase 2: lid pops off, cosmetic name peeks out
    const t2 = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(lidY, { toValue: -120, duration: 400, useNativeDriver: true }),
        RNAnimated.timing(lidRotate, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.timing(lidOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
      setShowPeek(true);
      RNAnimated.timing(peekOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 1200);

    // Phase 3: reveal card
    const t3 = setTimeout(() => {
      RNAnimated.timing(giftOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      RNAnimated.timing(peekOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setTimeout(() => {
        setShowReveal(true);
        RNAnimated.parallel([
          RNAnimated.spring(revealScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
          RNAnimated.timing(revealOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 200);
    }, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible, giftScale, giftWobble, giftOpacity, lidY, lidRotate, lidOpacity, peekOpacity, revealOpacity, revealScale, backdropOpacity]);

  if (!visible) return null;

  const rarityColor = RARITY_COLORS[rarity] ?? '#636E72';
  const bg = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <RNAnimated.View style={[st.backdrop, { backgroundColor: bg, opacity: backdropOpacity }]} />
      <Pressable style={st.container} onPress={showReveal ? onDismiss : undefined}>
        <Confetti />

        {/* Phase 1+2: Gift box + lid */}
        {!showReveal && (
          <RNAnimated.View style={{
            alignItems: 'center',
            opacity: giftOpacity,
            transform: [
              { scale: giftScale },
              { rotate: giftWobble.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] }) },
            ],
          }}>
            {/* Lid — animated to fly off */}
            <RNAnimated.View style={{
              opacity: lidOpacity,
              transform: [
                { translateY: lidY },
                { rotate: lidRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-25deg'] }) },
              ],
            }}>
              <GiftLid size={80} />
            </RNAnimated.View>

            {/* Cosmetic preview peeking out after lid pops */}
            {showPeek && (
              <RNAnimated.View style={[st.peekWrap, { opacity: peekOpacity }]}>
                <CosmeticPreview itemId={itemId} category={category} size={56} />
              </RNAnimated.View>
            )}

            {/* Box bottom */}
            <GiftBox size={80} />
          </RNAnimated.View>
        )}

        {/* Phase 3: Reveal card */}
        {showReveal && (
          <RNAnimated.View style={[st.revealCard, {
            backgroundColor: isDark ? '#1A1929' : '#FFFFFF',
            opacity: revealOpacity,
            transform: [{ scale: revealScale }],
          }]}>
            <View style={[st.claimedBadge, { backgroundColor: GOLD + '15' }]}>
              <Text style={st.claimedText}>{'\uD83C\uDF81'} CLAIMED!</Text>
            </View>

            {/* Visual preview of the cosmetic */}
            <View style={st.previewWrap}>
              <CosmeticPreview itemId={itemId} category={category} size={90} />
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
              <Text style={st.doneText}>{t('celebrations.milestone_gift_cta')}</Text>
            </Pressable>
          </RNAnimated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, overflow: 'hidden',
  },

  // Peek (cosmetic name visible between lid popping and reveal card)
  peekWrap: { alignItems: 'center', marginBottom: -4, marginTop: -8 },
  peekName: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  peekGlow: { width: 60, height: 60, borderRadius: 30, position: 'absolute', top: -20 },

  // Reveal card
  revealCard: {
    width: '100%', maxWidth: 340, borderRadius: 24, padding: 28,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 32, elevation: 16,
  },
  previewWrap: { marginBottom: 16, alignItems: 'center' },
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
