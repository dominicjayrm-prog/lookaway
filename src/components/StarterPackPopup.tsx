/**
 * StarterPackPopup — One-time £0.99 starter pack offer.
 * Contains: 200 gems + 3 of each Classic power-up + 1hr unlimited lives.
 * Shown after World 1 completion or from Shop.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { GemIcon, TimerIcon, EyeIcon, ScissorsIcon, HeartIcon, GiftIcon } from '@/src/components/AppIcons';

const { width: SW } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onPurchase: () => void;
}

interface PackItem {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  color: string;
}

const PACK_ITEMS: PackItem[] = [
  { icon: GemIcon, label: 'Gems', value: '200', color: '#6C5CE7' },
  { icon: TimerIcon, label: 'Slow Time', value: '\u00D73', color: '#0984E3' },
  { icon: EyeIcon, label: 'Peek', value: '\u00D73', color: '#00B894' },
  { icon: ScissorsIcon, label: '50/50', value: '\u00D73', color: '#F9CA24' },
  { icon: HeartIcon, label: 'Unlimited lives', value: '1 hour', color: '#FF6B6B' },
];

function StarterPackPopup({ visible, onDismiss, onPurchase }: Props) {
  const { colors } = useTheme();
  const backdrop = useRef(new RNAnimated.Value(0)).current;
  const cardScale = useRef(new RNAnimated.Value(0.85)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: false }),
        RNAnimated.spring(cardScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: false }),
        RNAnimated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    } else {
      backdrop.setValue(0);
      cardScale.setValue(0.85);
      cardOpacity.setValue(0);
    }
  }, [visible]);

  function handleDismiss() {
    RNAnimated.parallel([
      RNAnimated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      RNAnimated.timing(backdrop, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none">
      <View style={st.container}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'] }),
        }]} />

        <RNAnimated.View style={[st.card, {
          backgroundColor: colors.card,
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
          maxWidth: Math.min(SW - 40, 360),
        }]}>
          {/* Close */}
          <Pressable style={st.closeBtn} onPress={handleDismiss}>
            <Ionicons name="close" size={20} color={colors.textLight} />
          </Pressable>

          {/* Header */}
          <View style={st.headerArea}>
            <View style={st.giftIconWrap}><GiftIcon size={36} color="#FF6B6B" /></View>
            <Text style={[st.title, { color: colors.text }]}>Starter Pack</Text>
            <View style={st.priceRow}>
              <Text style={[st.oldPrice, { color: colors.textLight }]}>{'\u00A3'}3.99</Text>
              <Text style={[st.newPrice, { color: colors.accent }]}>{'\u00A3'}0.99</Text>
            </View>
            <View style={[st.savePill, { backgroundColor: colors.wrong }]}>
              <Text style={st.saveText}>75% OFF — LIMITED TIME</Text>
            </View>
          </View>

          {/* Items */}
          <View style={st.itemsList}>
            {PACK_ITEMS.map((item, i) => (
              <View key={i} style={[st.itemRow, i < PACK_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={st.itemIconWrap}><item.icon size={18} color={item.color} /></View>
                <Text style={[st.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[st.itemValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Value breakdown */}
          <View style={[st.valuePill, { backgroundColor: colors.correctSoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.correct} />
            <Text style={[st.valueText, { color: colors.correct }]}>Total value: {'\u00A3'}3.99 — you pay {'\u00A3'}0.99</Text>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [st.ctaBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }]}
            onPress={onPurchase}
          >
            <Text style={st.ctaText}>Get Starter Pack — {'\u00A3'}0.99</Text>
          </Pressable>

          {/* Skip */}
          <Pressable onPress={handleDismiss} style={st.skipBtn}>
            <Text style={[st.skipText, { color: colors.textLight }]}>No thanks</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default StarterPackPopup;

const st = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, zIndex: 10,
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },

  headerArea: { alignItems: 'center', paddingTop: 28, paddingBottom: 16, paddingHorizontal: 20 },
  giftIconWrap: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  oldPrice: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 24, fontWeight: '900' },
  savePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  saveText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },

  itemsList: { paddingHorizontal: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  itemIconWrap: { width: 28, alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  itemValue: { fontSize: 14, fontWeight: '800' },

  valuePill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 14, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  valueText: { fontSize: 12, fontWeight: '700' },

  ctaBtn: {
    marginHorizontal: 20, marginTop: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 13, fontWeight: '600' },
});
