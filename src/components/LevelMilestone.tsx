/**
 * Brief animated overlay shown when the player hits a level milestone.
 * Shows at 10, 25, 50, 100, 150, 200 levels completed.
 * Auto-dismisses after 2.5 seconds.
 */
import React
import { t } from '@/src/i18n';, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Dimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

var MILESTONES: Record<number, { label: string; emoji: string }> = {
  10: { label: 'Getting started!', emoji: '\uD83D\uDE80' },
  25: { label: 'Quarter century!', emoji: '\uD83D\uDD25' },
  50: { label: 'Fifty levels deep!', emoji: '\u2B50' },
  100: { label: 'Century club!', emoji: '\uD83C\uDFC6' },
  150: { label: 'Memory legend!', emoji: '\uD83E\uDDE0' },
  200: { label: 'Maximum power!', emoji: '\uD83D\uDC51' },
};

interface Props {
  levelCount: number;
  onDone: () => void;
}

function LevelMilestone({ levelCount, onDone }: Props) {
  var milestone = MILESTONES[levelCount];
  if (!milestone) { onDone(); return null; }

  var { width: sw } = Dimensions.get('window');
  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var ringScale = useRef(new RNAnimated.Value(0)).current;
  var ringOpacity = useRef(new RNAnimated.Value(0)).current;
  var badgeScale = useRef(new RNAnimated.Value(0)).current;
  var textOpacity = useRef(new RNAnimated.Value(0)).current;

  var particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
      angle: (i / 8) * Math.PI * 2,
      distance: 50 + Math.random() * 60,
      size: 5 + Math.random() * 8,
      color: ['#D4A012', '#6C5CE7', '#00B894', '#FF6B6B'][i % 4],
    }))
  ).current;

  useEffect(() => {
    RNAnimated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: false }).start();

    RNAnimated.sequence([
      RNAnimated.delay(100),
      RNAnimated.parallel([
        RNAnimated.timing(ringScale, { toValue: 2, duration: 800, useNativeDriver: false }),
        RNAnimated.sequence([
          RNAnimated.timing(ringOpacity, { toValue: 0.4, duration: 200, useNativeDriver: false }),
          RNAnimated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: false }),
        ]),
      ]),
    ]).start();

    RNAnimated.sequence([
      RNAnimated.delay(150),
      RNAnimated.spring(badgeScale, { toValue: 1, friction: 3.5, tension: 200, useNativeDriver: false }),
    ]).start();

    RNAnimated.sequence([
      RNAnimated.delay(400),
      RNAnimated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();

    particles.forEach((p, i) => {
      var dx = Math.cos(p.angle) * p.distance;
      var dy = Math.sin(p.angle) * p.distance;
      RNAnimated.sequence([
        RNAnimated.delay(200 + i * 30),
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: dx, duration: 500, useNativeDriver: false }),
          RNAnimated.timing(p.y, { toValue: dy - 15, duration: 500, useNativeDriver: false }),
          RNAnimated.sequence([
            RNAnimated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: false }),
            RNAnimated.delay(200),
            RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          RNAnimated.sequence([
            RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: false }),
          ]),
        ]),
      ]).start();
    });

    // Auto-dismiss
    var timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(badgeScale, { toValue: 0, duration: 300, useNativeDriver: false }),
        RNAnimated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
        RNAnimated.timing(backdrop, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]).start(() => onDone());
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <RNAnimated.View style={[StyleSheet.absoluteFill, {
        backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'] }),
      }]} />

      <View style={st.center}>
        <RNAnimated.View style={[st.ring, {
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }]} />

        {particles.map((p, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute',
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }}>
            <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
              <Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={p.color} />
            </Svg>
          </RNAnimated.View>
        ))}

        <RNAnimated.View style={[st.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={st.emoji}>{milestone.emoji}</Text>
          <Text style={st.count}>{levelCount}</Text>
          <Text style={st.countLabel}>{t('celebrations.level_milestone_label')}</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{ opacity: textOpacity, marginTop: 16 }}>
          <Text style={st.label}>{milestone.label}</Text>
        </RNAnimated.View>
      </View>
    </View>
  );
}

export default LevelMilestone;
export { MILESTONES };

var st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#6C5CE7' },
  badge: {
    width: 90, height: 90, borderRadius: 22,
    backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 25,
  },
  emoji: { fontSize: 28, marginBottom: 2 },
  count: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  countLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  label: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
});
