/**
 * Cinematic celebration shown when the player completes the final level of a world.
 * Full-screen modal with expanding rings, particle burst, crown icon, stats summary.
 */
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import Svg, { Polygon, Path } from 'react-native-svg';
import { CELEBRATION_COLORS } from '@/src/utils/animations';

var { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  worldNumber: number;
  worldName: string;
  worldColor: string;
  starsEarned: number;
  totalStars: number;
  isPerfect: boolean;
  nextWorldName?: string;
  onDismiss: () => void;
}

function WorldCompleteCelebration({ visible, worldNumber, worldName, worldColor, starsEarned, totalStars, isPerfect, nextWorldName, onDismiss }: Props) {
  var cx = SW / 2;
  var cy = SH * 0.32;

  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var rings = [useRef(new RNAnimated.Value(0)).current, useRef(new RNAnimated.Value(0)).current, useRef(new RNAnimated.Value(0)).current];
  var crownScale = useRef(new RNAnimated.Value(0)).current;
  var titleOpacity = useRef(new RNAnimated.Value(0)).current;
  var titleScale = useRef(new RNAnimated.Value(0.5)).current;
  var statsOpacity = useRef(new RNAnimated.Value(0)).current;
  var perfectOpacity = useRef(new RNAnimated.Value(0)).current;
  var perfectScale = useRef(new RNAnimated.Value(0)).current;
  var btnY = useRef(new RNAnimated.Value(30)).current;
  var btnOpacity = useRef(new RNAnimated.Value(0)).current;
  var [dismissing, setDismissing] = useState(false);

  var particles = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
      angle: (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      distance: 60 + Math.random() * 140,
      size: 6 + Math.random() * 14,
      color: (CELEBRATION_COLORS.worldColors[worldNumber] ?? CELEBRATION_COLORS.purple)[Math.floor(Math.random() * 4)],
      isStar: Math.random() > 0.4,
      delay: Math.random() * 400,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    RNAnimated.timing(backdrop, { toValue: 1, duration: 400, useNativeDriver: false }).start();

    rings.forEach((r, i) => {
      RNAnimated.sequence([
        RNAnimated.delay(200 + i * 160),
        RNAnimated.timing(r, { toValue: 1, duration: 900, useNativeDriver: false }),
      ]).start();
    });

    RNAnimated.sequence([
      RNAnimated.delay(350),
      RNAnimated.spring(crownScale, { toValue: 1, friction: 3.5, tension: 200, useNativeDriver: false }),
    ]).start();

    RNAnimated.sequence([
      RNAnimated.delay(600),
      RNAnimated.parallel([
        RNAnimated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        RNAnimated.spring(titleScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      ]),
    ]).start();

    RNAnimated.sequence([
      RNAnimated.delay(900),
      RNAnimated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();

    if (isPerfect) {
      RNAnimated.sequence([
        RNAnimated.delay(1100),
        RNAnimated.parallel([
          RNAnimated.timing(perfectOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          RNAnimated.spring(perfectScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: false }),
        ]),
      ]).start();
    }

    RNAnimated.sequence([
      RNAnimated.delay(1200),
      RNAnimated.parallel([
        RNAnimated.spring(btnY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: false }),
        RNAnimated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
    ]).start();

    particles.forEach(p => {
      var dx = Math.cos(p.angle) * p.distance;
      var dy = Math.sin(p.angle) * p.distance - 30;
      RNAnimated.sequence([
        RNAnimated.delay(450 + p.delay),
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: dx, duration: 700, useNativeDriver: false }),
          RNAnimated.timing(p.y, { toValue: dy, duration: 700, useNativeDriver: false }),
          RNAnimated.sequence([
            RNAnimated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: false }),
            RNAnimated.delay(350),
            RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          RNAnimated.sequence([
            RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: false }),
            RNAnimated.delay(250),
            RNAnimated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
        ]),
      ]).start();
    });
  }, [visible]);

  function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    RNAnimated.parallel([
      RNAnimated.timing(btnOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      RNAnimated.timing(statsOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      RNAnimated.sequence([
        RNAnimated.delay(100),
        RNAnimated.timing(titleOpacity, { toValue: 0, duration: 250, useNativeDriver: false }),
      ]),
      RNAnimated.sequence([
        RNAnimated.delay(150),
        RNAnimated.timing(crownScale, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
      RNAnimated.sequence([
        RNAnimated.delay(250),
        RNAnimated.timing(backdrop, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  var maxRing = Math.max(SW, SH) * 0.9;

  return (
    <Modal visible transparent animationType="none">
      <View style={StyleSheet.absoluteFill}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(10,10,30,0)', 'rgba(10,10,30,0.88)'] }),
        }]} />

        {rings.map((r, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute', left: cx - maxRing / 2, top: cy - maxRing / 2,
            width: maxRing, height: maxRing, borderRadius: maxRing / 2,
            borderWidth: 2.5, borderColor: worldColor,
            opacity: r.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.3 - i * 0.08, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.6 + i * 0.25] }) }],
          }} />
        ))}

        {particles.map((p, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute', left: cx - p.size / 2, top: cy - p.size / 2,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }}>
            {p.isStar ? (
              <Svg width={p.size} height={p.size} viewBox="0 0 24 24"><Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={p.color} /></Svg>
            ) : (
              <View style={{ width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color }} />
            )}
          </RNAnimated.View>
        ))}

        <RNAnimated.View style={{
          position: 'absolute', left: cx - 40, top: cy - 40,
          width: 80, height: 80, borderRadius: 22,
          backgroundColor: worldColor, alignItems: 'center', justifyContent: 'center',
          shadowColor: worldColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30,
          transform: [{ scale: crownScale }],
        }}>
          <Svg width={40} height={40} viewBox="0 0 24 24">
            <Path d="M3,18 L5,8 L9,13 L12,5 L15,13 L19,8 L21,18 Z" fill="white" strokeLinejoin="round" />
          </Svg>
        </RNAnimated.View>

        <RNAnimated.View style={{
          position: 'absolute', left: 20, right: 20, top: cy + 60,
          alignItems: 'center',
          opacity: titleOpacity,
          transform: [{ scale: titleScale }],
        }}>
          <Text style={s.worldLabel}>WORLD {worldNumber}</Text>
          <Text style={s.title}>{worldName}</Text>
          <Text style={s.subtitle}>{t('celebrations.world_complete_sub')}</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{ position: 'absolute', left: 20, right: 20, top: cy + 170, alignItems: 'center', opacity: statsOpacity }}>
          <View style={s.statRow}>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="#D4A012" /></Svg>
            <Text style={s.statText}>{starsEarned} / {totalStars} stars</Text>
          </View>
          {nextWorldName && <Text style={s.nextWorld}>Next: {nextWorldName}</Text>}
        </RNAnimated.View>

        {isPerfect && (
          <RNAnimated.View style={{
            position: 'absolute', left: 20, right: 20, top: cy + 230, alignItems: 'center',
            opacity: perfectOpacity, transform: [{ scale: perfectScale }],
          }}>
            <View style={s.perfectBadge}>
              <Text style={s.perfectText}>{t('celebrations.world_perfect')}</Text>
            </View>
          </RNAnimated.View>
        )}

        <RNAnimated.View style={{
          position: 'absolute', left: Math.max(20, (SW - 280) / 2), right: Math.max(20, (SW - 280) / 2),
          bottom: SH * 0.15, opacity: btnOpacity, transform: [{ translateY: btnY }],
        }}>
          <Pressable style={[s.btn, { backgroundColor: worldColor }]} onPress={handleDismiss}>
            <Text style={s.btnText}>{nextWorldName ? 'Continue' : 'Done'}</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default WorldCompleteCelebration;

var s = StyleSheet.create({
  worldLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  nextWorld: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  perfectBadge: { backgroundColor: 'rgba(212,160,18,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#D4A012' },
  perfectText: { fontSize: 13, fontWeight: '800', color: '#D4A012', letterSpacing: 2 },
  btn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
