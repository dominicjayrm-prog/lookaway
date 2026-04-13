/**
 * MilestoneUnlockToast — slides from top when a milestone cosmetic
 * is earned. Shows gift emoji, item name, rarity. Auto-dismisses
 * after 3 seconds.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { RARITY_COLORS } from '@/src/data/cosmetics';

interface Props {
  visible: boolean;
  itemName: string;
  rarity: string;
  category: string;
  onDismiss: () => void;
}

export function MilestoneUnlockToast({ visible, itemName, rarity, category, onDismiss }: Props) {
  const slideY = useRef(new RNAnimated.Value(-120)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      RNAnimated.sequence([
        RNAnimated.spring(slideY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        RNAnimated.delay(3000),
        RNAnimated.timing(slideY, { toValue: -120, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    } else {
      slideY.setValue(-120);
    }
  }, [visible, slideY, onDismiss]);

  if (!visible) return null;

  const rarityColor = RARITY_COLORS[rarity] ?? '#636E72';

  return (
    <RNAnimated.View style={[st.container, { transform: [{ translateY: slideY }] }]}>
      <Pressable
        style={st.inner}
        onPress={() => {
          onDismiss();
          router.push('/(tabs)/shop');
        }}
      >
        <View style={st.iconWrap}>
          <Text style={{ fontSize: 20 }}>{'\uD83C\uDF81'}</Text>
        </View>
        <View style={st.textWrap}>
          <Text style={st.title}>Milestone Reward!</Text>
          <Text style={st.name}>{itemName}</Text>
          <Text style={[st.rarity, { color: rarityColor }]}>
            {rarity.charAt(0).toUpperCase() + rarity.slice(1)} {category}
          </Text>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
}

const st = StyleSheet.create({
  container: {
    position: 'absolute', top: 50, left: 16, right: 16, zIndex: 999,
  },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(212,160,18,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: 12, fontWeight: '800', color: '#1A1A18', marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A18', marginBottom: 1 },
  rarity: { fontSize: 10, fontWeight: '600' },
});
