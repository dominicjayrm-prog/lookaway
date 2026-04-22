/**
 * One-time celebration shown when the player completes their very first level.
 * "Welcome to Blanked! Your journey begins."
 * Only shows once ever, tracked by localStorage.
 */
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import Svg, { Circle as SvgCircle, Polygon } from 'react-native-svg';

var { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

function FirstLevelCelebration({ visible, onDismiss }: Props) {
  var cx = SW / 2;
  var cy = SH * 0.35;
  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var iconScale = useRef(new RNAnimated.Value(0)).current;
  var ring1 = useRef(new RNAnimated.Value(0)).current;
  var ring2 = useRef(new RNAnimated.Value(0)).current;
  var titleOpacity = useRef(new RNAnimated.Value(0)).current;
  var titleScale = useRef(new RNAnimated.Value(0.5)).current;
  var bodyOpacity = useRef(new RNAnimated.Value(0)).current;
  var btnY = useRef(new RNAnimated.Value(30)).current;
  var btnOpacity = useRef(new RNAnimated.Value(0)).current;
  var [dismissing, setDismissing] = useState(false);

  var particles = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      x: new RNAnimated.Value(0), y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0), scale: new RNAnimated.Value(0),
      angle: (i / 10) * Math.PI * 2 + Math.random() * 0.5,
      distance: 50 + Math.random() * 100,
      size: 5 + Math.random() * 10,
      color: ['#6C5CE7', '#00B894', '#D4A012', '#FF6B6B', '#0984E3'][i % 5],
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    RNAnimated.timing(backdrop, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    [ring1, ring2].forEach((r, i) => {
      RNAnimated.sequence([
        RNAnimated.delay(200 + i * 180),
        RNAnimated.timing(r, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start();
    });
    RNAnimated.sequence([
      RNAnimated.delay(300),
      RNAnimated.spring(iconScale, { toValue: 1, friction: 3.5, tension: 200, useNativeDriver: true }),
    ]).start();
    RNAnimated.sequence([
      RNAnimated.delay(600),
      RNAnimated.parallel([
        RNAnimated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(titleScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();
    RNAnimated.sequence([
      RNAnimated.delay(900),
      RNAnimated.timing(bodyOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    RNAnimated.sequence([
      RNAnimated.delay(1100),
      RNAnimated.parallel([
        RNAnimated.spring(btnY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
        RNAnimated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    particles.forEach(p => {
      var dx = Math.cos(p.angle) * p.distance;
      var dy = Math.sin(p.angle) * p.distance - 20;
      RNAnimated.sequence([
        RNAnimated.delay(400 + Math.random() * 300),
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: dx, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(p.y, { toValue: dy, duration: 600, useNativeDriver: true }),
          RNAnimated.sequence([
            RNAnimated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
            RNAnimated.delay(300),
            RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]),
          RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [visible]);

  function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    RNAnimated.parallel([
      RNAnimated.timing(btnOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(bodyOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.sequence([
        RNAnimated.delay(100),
        RNAnimated.timing(titleOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.delay(150),
        RNAnimated.timing(iconScale, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.delay(250),
        RNAnimated.timing(backdrop, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  var maxRing = Math.max(SW, SH) * 0.8;

  return (
    <Modal visible transparent animationType="none">
      <View style={StyleSheet.absoluteFill}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(10,10,30,0)', 'rgba(10,10,30,0.85)'] }),
        }]} />

        {[ring1, ring2].map((r, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute', left: cx - maxRing / 2, top: cy - maxRing / 2,
            width: maxRing, height: maxRing, borderRadius: maxRing / 2,
            borderWidth: 2, borderColor: '#00B894',
            opacity: r.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.25 - i * 0.08, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.5 + i * 0.3] }) }],
          }} />
        ))}

        {particles.map((p, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute', left: cx - p.size / 2, top: cy - p.size / 2,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }}>
            <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
              <Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={p.color} />
            </Svg>
          </RNAnimated.View>
        ))}

        <RNAnimated.View style={{
          position: 'absolute', left: cx - 36, top: cy - 36,
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: '#00B894', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#00B894', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 25,
          transform: [{ scale: iconScale }],
        }}>
          <Text style={{ fontSize: 32, color: '#FFFFFF' }}>{'\u2713'}</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{
          position: 'absolute', left: 20, right: 20, top: cy + 55, alignItems: 'center',
          opacity: titleOpacity, transform: [{ scale: titleScale }],
        }}>
          <Text style={st.title}>{t('celebrations.first_level_title')}</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{ position: 'absolute', left: 20, right: 20, top: cy + 110, alignItems: 'center', opacity: bodyOpacity }}>
          <Text style={st.body}>Welcome to Blanked.{'\n'}Your memory journey has begun.</Text>
        </RNAnimated.View>

        <RNAnimated.View style={{
          position: 'absolute', left: Math.max(20, (SW - 280) / 2), right: Math.max(20, (SW - 280) / 2),
          bottom: SH * 0.15, opacity: btnOpacity, transform: [{ translateY: btnY }],
        }}>
          <Pressable style={st.btn} onPress={handleDismiss}>
            <Text style={st.btnText}>{t('celebrations.first_level_cta')}</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default FirstLevelCelebration;

var st = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  body: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  btn: {
    backgroundColor: '#00B894', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    shadowColor: '#00B894', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
