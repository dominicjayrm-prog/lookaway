/**
 * Starter Pack Paywall — Bottom sheet modal.
 * One-time £0.99 purchase. Bouncing gift, shimmer CTA, item list.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Animated as RNAnimated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onPurchase: () => void;
}

// ── SVG Icons (inline, no emojis) ─────────────────────────────────────
function GiftSvg({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={10} width={18} height={12} rx={2} stroke="#FF6B6B" strokeWidth={1.8} />
      <Rect x={2} y={7} width={20} height={5} rx={1.5} stroke="#FF6B6B" strokeWidth={1.8} />
      <Line x1={12} y1={7} x2={12} y2={22} stroke="#FF6B6B" strokeWidth={1.5} />
      <Path d="M12 7c0 0-2-4-5-4s-3 2-1 3 6 1 6 1" stroke="#FF6B6B" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 7c0 0 2-4 5-4s3 2 1 3-6 1-6 1" stroke="#FF6B6B" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
function GemSvg({ size = 18, color = '#6C5CE7' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" fill={color} opacity={0.15} />
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M2 10h20M12 22L8 10l4-7 4 7-4 12z" stroke={color} strokeWidth={1} strokeLinejoin="round" opacity={0.4} />
    </Svg>
  );
}
function ClockSvg({ size = 18, color = '#0984E3' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
      <Path d="M12 9v4l3 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={10} y1={3} x2={14} y2={3} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function EyeSvg({ size = 18, color = '#00B894' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={3} fill={color} />
    </Svg>
  );
}
function ChevronSvg({ size = 18, color = '#D4A012' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 18l6-6-6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
    </Svg>
  );
}
function HeartSvg({ size = 18, color = '#FF6B6B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
    </Svg>
  );
}

// ── Pack Items ─────────────────────────────────────────────────────────
const ITEMS = [
  { Icon: GemSvg, color: '#6C5CE7', bg: '#6C5CE712', name: '200 Gems', desc: 'For power-ups & extras', value: '200', valueColor: '#6C5CE7' },
  { Icon: ClockSvg, color: '#0984E3', bg: '#0984E312', name: 'Slow Time', desc: 'Extra seconds to memorise', value: '\u00D73', valueColor: '#0984E3' },
  { Icon: EyeSvg, color: '#00B894', bg: '#00B89412', name: 'Peek', desc: 'Glance back at the scene', value: '\u00D73', valueColor: '#00B894' },
  { Icon: ChevronSvg, color: '#D4A012', bg: '#D4A01212', name: '50/50', desc: 'Remove 2 wrong answers', value: '\u00D73', valueColor: '#D4A012' },
  { Icon: HeartSvg, color: '#FF6B6B', bg: '#FF6B6B12', name: 'Unlimited lives', desc: 'Play without stopping', value: '1hr', valueColor: '#FF6B6B' },
];

// ── Shimmer Button ────────────────────────────────────────────────────
function ShimmerButton({ text, onPress }: { text: string; onPress: () => void }) {
  const shimmer = useRef(new RNAnimated.Value(-0.3)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.timing(shimmer, { toValue: 1.3, duration: 2500, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, SW + 80],
  });
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.shimmerBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
      <RNAnimated.View style={[st.shimmerStripe, { transform: [{ translateX }, { skewX: '-20deg' }] }]} />
      <Text style={st.shimmerText}>{text}</Text>
    </Pressable>
  );
}

// ── Main Component ────────────────────────────────────────────────────
function StarterPackPopup({ visible, onDismiss, onPurchase }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const floatAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, { toValue: 0, friction: 10, tension: 55, useNativeDriver: true }),
        RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      // Bouncing gift
      const bounce = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(floatAnim, { toValue: -4, duration: 1000, useNativeDriver: true }),
          RNAnimated.timing(floatAnim, { toValue: 4, duration: 1000, useNativeDriver: true }),
        ])
      );
      bounce.start();
      return () => bounce.stop();
    } else {
      slideAnim.setValue(SH);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  function handleDismiss() {
    RNAnimated.parallel([
      RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }),
      RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      {/* Dark backdrop */}
      <RNAnimated.View style={[st.backdrop, { opacity: backdropOpacity }]} />
      <View style={st.modalContainer}>
        {/* Tap backdrop to dismiss */}
        <Pressable style={st.backdropTouch} onPress={handleDismiss} />

        {/* Bottom sheet */}
        <RNAnimated.View style={[
          st.sheet,
          { transform: [{ translateY: slideAnim }], paddingBottom: Math.max(insets.bottom + 8, 24), maxWidth: Platform.OS === 'web' ? 430 : undefined },
        ]}>
          {/* Drag handle */}
          <View style={st.dragHandle} />

          {/* Close button */}
          <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={16} color="#B2BEC3" />
          </Pressable>

          {/* Bouncing gift icon */}
          <RNAnimated.View style={[st.giftWrap, { transform: [{ translateY: floatAnim }] }]}>
            <GiftSvg size={28} />
          </RNAnimated.View>

          {/* Title */}
          <Text style={st.title}>Starter Pack</Text>

          {/* Price row */}
          <View style={st.priceRow}>
            <Text style={st.oldPrice}>{'\u00A3'}3.99</Text>
            <Text style={st.newPrice}>{'\u00A3'}0.99</Text>
          </View>

          {/* Badge */}
          <View style={st.badge}>
            <Text style={st.badgeText}>75% OFF — ONE TIME PURCHASE</Text>
          </View>

          {/* Items list */}
          <View style={st.itemsList}>
            {ITEMS.map((item, i) => (
              <View key={i} style={[st.itemRow, i < ITEMS.length - 1 && st.itemBorder]}>
                <View style={[st.itemIcon, { backgroundColor: item.bg }]}>
                  <item.Icon size={18} color={item.color} />
                </View>
                <View style={st.itemText}>
                  <Text style={st.itemName}>{item.name}</Text>
                  <Text style={st.itemDesc}>{item.desc}</Text>
                </View>
                <View style={[st.valuePill, { backgroundColor: item.bg }]}>
                  <Text style={[st.valueText, { color: item.valueColor }]}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Green banner */}
          <View style={st.greenBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#00B894" />
            <Text style={st.greenText}>Everything you need to get started</Text>
          </View>

          {/* Shimmer CTA */}
          <ShimmerButton text={`Get Starter Pack \u2014 \u00A30.99`} onPress={onPurchase} />

          {/* No thanks */}
          <Pressable onPress={handleDismiss} style={st.noThanksBtn} hitSlop={8}>
            <Text style={st.noThanksText}>No thanks</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default StarterPackPopup;

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },

  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', marginBottom: 14 },
  closeBtn: {
    position: 'absolute', top: 14, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F0EFEC', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },

  giftWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#FF6B6B10', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },

  title: { fontSize: 24, fontWeight: '800', color: '#1A1A18', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  oldPrice: { fontSize: 16, fontWeight: '600', color: '#B2BEC3', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 32, fontWeight: '800', color: '#6C5CE7' },

  badge: { backgroundColor: '#FF6B6B', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, marginBottom: 16 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },

  itemsList: { width: '100%', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1A1A18' },
  itemDesc: { fontSize: 11, color: '#636E72', marginTop: 1 },
  valuePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  valueText: { fontSize: 13, fontWeight: '800' },

  greenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%',
    backgroundColor: '#00B89410', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 14,
  },
  greenText: { fontSize: 12, fontWeight: '700', color: '#00B894' },

  shimmerBtn: {
    width: '100%', backgroundColor: '#6C5CE7', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#6C5CE7', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 18, elevation: 6,
    marginBottom: 8,
  },
  shimmerStripe: {
    position: 'absolute', top: 0, bottom: 0, width: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shimmerText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  noThanksBtn: { paddingVertical: 8 },
  noThanksText: { fontSize: 11, color: '#B2BEC3', fontWeight: '500', opacity: 0.6 },
});
