/**
 * CosmeticCelebration — Confetti celebration overlay when acquiring cosmetics.
 * Shows the item preview with a particle burst and a message.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Blink } from './Blink';
import { AvatarFrame } from './AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
import type { Cosmetic } from '@/src/data/cosmetics';

const CONFETTI_COLORS = ['#6C5CE7', '#A29BFE', '#D4A012', '#00B894', '#FF6B6B', '#0984E3', '#FD79A8', '#FDCB6E'];

interface Props {
  visible: boolean;
  item: Cosmetic | null;
  onDismiss: () => void;
  message?: string;
}

function CosmeticCelebrationComponent({ visible, item, onDismiss, message = 'Added to your collection!' }: Props) {
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const itemScale = useRef(new RNAnimated.Value(0)).current;
  const textOpacity = useRef(new RNAnimated.Value(0)).current;

  // 12 confetti particles
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (!visible || !item) return;

    // Reset
    backdropOpacity.setValue(0);
    itemScale.setValue(0);
    textOpacity.setValue(0);
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0); });

    // 1. Backdrop fade (0-300ms)
    RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // 2. Item spring in (200-600ms)
    setTimeout(() => {
      RNAnimated.spring(itemScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
    }, 200);

    // 3. Confetti burst (400-1100ms)
    setTimeout(() => {
      particles.forEach((p, i) => {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = 60 + Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 20;
        const delay = Math.random() * 150;

        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.parallel([
            RNAnimated.timing(p.x, { toValue: dx, duration: 600, useNativeDriver: true }),
            RNAnimated.timing(p.y, { toValue: dy, duration: 600, useNativeDriver: true }),
            RNAnimated.sequence([
              RNAnimated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              RNAnimated.delay(300),
              RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
            RNAnimated.sequence([
              RNAnimated.spring(p.scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
              RNAnimated.delay(200),
              RNAnimated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }, 400);

    // 4. Text fade (600-900ms)
    setTimeout(() => {
      RNAnimated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 600);

    // 5. Auto-dismiss after 2.5s
    const timer = setTimeout(() => dismiss(), 2500);
    return () => clearTimeout(timer);
  }, [visible, item, onDismiss]);

  const dismiss = () => {
    RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
  };

  if (!visible || !item) return null;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
      <RNAnimated.View style={[st.backdrop, { opacity: backdropOpacity }]}>
        {/* Confetti particles */}
        {particles.map((p, i) => (
          <RNAnimated.View
            key={i}
            style={[st.particle, {
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: 6 + Math.random() * 6,
              height: 6 + Math.random() * 6,
              borderRadius: Math.random() > 0.5 ? 999 : 2,
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
            }]}
          />
        ))}

        {/* Item preview */}
        <RNAnimated.View style={[st.itemContainer, { transform: [{ scale: itemScale }] }]}>
          {item.type === 'frame' && (
            <AvatarFrame frame={getFrameById(item.id) ?? null} size={80}>
              <Blink expression="celebrate" size={80} />
            </AvatarFrame>
          )}
          {item.type === 'expression' && (
            <Blink expression={(item as any).blinkExpression ?? 'normal'} size={80} />
          )}
          {item.type === 'banner' && (
            <LinearGradient
              colors={(item as any).gradientColors ?? ['#6C5CE7', '#A29BFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 120, height: 60, borderRadius: 14 }}
            />
          )}
        </RNAnimated.View>

        {/* Message */}
        <RNAnimated.View style={{ opacity: textOpacity, marginTop: 20 }}>
          <Text style={st.message}>{message}</Text>
        </RNAnimated.View>
      </RNAnimated.View>
    </Pressable>
  );
}

export const CosmeticCelebration = React.memo(CosmeticCelebrationComponent);

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  particle: {
    position: 'absolute',
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
});
