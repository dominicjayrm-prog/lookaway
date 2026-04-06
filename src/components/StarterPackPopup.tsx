/**
 * StarterPackPopup — Full-screen starter pack offer.
 * £0.99 one-time (75% OFF). Clean, premium, mobile-first.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GemIcon, TimerIcon, EyeIcon, ScissorsIcon, HeartIcon, GiftIcon } from '@/src/components/AppIcons';

const { height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onPurchase: () => void;
}

interface PackItem {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  color: string;
}

const PACK_ITEMS: PackItem[] = [
  { Icon: GemIcon, label: 'Gems', value: '200', color: '#6C5CE7' },
  { Icon: TimerIcon, label: 'Slow Time', value: '\u00D73', color: '#0984E3' },
  { Icon: EyeIcon, label: 'Peek', value: '\u00D73', color: '#00B894' },
  { Icon: ScissorsIcon, label: '50/50', value: '\u00D73', color: '#F9CA24' },
  { Icon: HeartIcon, label: 'Unlimited lives', value: '1 hour', color: '#FF6B6B' },
];

function StarterPackPopup({ visible, onDismiss, onPurchase }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible]);

  function handleDismiss() {
    RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <RNAnimated.View style={[st.fullScreen, { transform: [{ translateY: slideAnim }] }]}>
        {/* Purple gradient top area */}
        <LinearGradient
          colors={['#7C6CF0', '#6C5CE7', '#5B4CC8']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[st.topSection, { paddingTop: Math.max(insets.top + 12, 24) }]}
        >
          {/* Close */}
          <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          {/* Hero */}
          <View style={st.heroArea}>
            <View style={st.giftCircle}>
              <GiftIcon size={32} color="#FF6B6B" />
            </View>
            <Text style={st.heroTitle}>Starter Pack</Text>
            <Text style={st.heroSubtitle}>Everything you need to get ahead</Text>
          </View>

          {/* Price */}
          <View style={st.priceArea}>
            <Text style={st.oldPrice}>{'\u00A3'}3.99</Text>
            <Text style={st.newPrice}>{'\u00A3'}0.99</Text>
          </View>
          <View style={st.savePill}>
            <Text style={st.saveText}>75% OFF</Text>
          </View>

          {/* Decorative circles */}
          <View style={[st.deco, { top: -20, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
          <View style={[st.deco, { bottom: 10, left: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        </LinearGradient>

        {/* White bottom card */}
        <View style={[st.bottomSection, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
          {/* Items list */}
          {PACK_ITEMS.map((item, i) => (
            <View key={i} style={[st.itemRow, i < PACK_ITEMS.length - 1 && st.itemBorder]}>
              <View style={[st.itemIconBg, { backgroundColor: item.color + '10' }]}>
                <item.Icon size={18} color={item.color} />
              </View>
              <Text style={st.itemLabel}>{item.label}</Text>
              <Text style={[st.itemValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}

          {/* Value note */}
          <View style={st.valueRow}>
            <Ionicons name="checkmark-circle" size={15} color="#00B894" />
            <Text style={st.valueText}>Total value: {'\u00A3'}3.99 \u2014 you pay {'\u00A3'}0.99</Text>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [st.ctaBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
            onPress={onPurchase}
          >
            <LinearGradient
              colors={['#6C5CE7', '#5B4CC8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.ctaGradient}
            >
              <Text style={st.ctaText}>Get Starter Pack \u2014 {'\u00A3'}0.99</Text>
            </LinearGradient>
          </Pressable>

          {/* Skip */}
          <Pressable onPress={handleDismiss} style={st.skipBtn} hitSlop={8}>
            <Text style={st.skipText}>No thanks</Text>
          </Pressable>
        </View>
      </RNAnimated.View>
    </Modal>
  );
}

export default StarterPackPopup;

const st = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#FFFFFF' },

  topSection: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  heroArea: { alignItems: 'center', marginTop: 36 },
  giftCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  priceArea: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  oldPrice: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  savePill: { marginTop: 8, backgroundColor: '#FF6B6B', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  saveText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 1 },

  deco: { position: 'absolute' },

  bottomSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  itemIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A18' },
  itemValue: { fontSize: 15, fontWeight: '800' },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,184,148,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  valueText: { fontSize: 13, fontWeight: '700', color: '#00B894' },

  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  ctaGradient: { paddingVertical: 17, alignItems: 'center', borderRadius: 16 },
  ctaText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },

  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 13, fontWeight: '600', color: '#B2BEC3' },
});
