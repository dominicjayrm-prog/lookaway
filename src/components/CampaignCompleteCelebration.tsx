/**
 * The ultimate celebration — shown when the player completes ALL 200 classic levels.
 * Cinematic 4-second sequence with all 6 world colors bursting in sequence.
 */
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import Svg, { Polygon, Path } from 'react-native-svg';

var { width: SW, height: SH } = Dimensions.get('window');
var WORLD_COLORS = ['#00B894', '#0984E3', '#6C5CE7', '#F9A825', '#FF6B6B', '#1A1A18'];

interface Props {
  visible: boolean;
  totalStars: number;
  maxStars: number;
  onDismiss: () => void;
}

function CampaignCompleteCelebration({ visible, totalStars, maxStars, onDismiss }: Props) {
  var cx = SW / 2;
  var cy = SH * 0.3;
  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var crownScale = useRef(new RNAnimated.Value(0)).current;
  var titleOpacity = useRef(new RNAnimated.Value(0)).current;
  var titleScale = useRef(new RNAnimated.Value(0.5)).current;
  var statsOpacity = useRef(new RNAnimated.Value(0)).current;
  var btnY = useRef(new RNAnimated.Value(30)).current;
  var btnOpacity = useRef(new RNAnimated.Value(0)).current;
  var shimmerOpacity = useRef(new RNAnimated.Value(0)).current;
  var [dismissing, setDismissing] = useState(false);

  // 6 rings — one per world color
  var worldRings = useRef(WORLD_COLORS.map(() => new RNAnimated.Value(0))).current;

  // 24 particles in all world colors
  var particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      x: new RNAnimated.Value(0), y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0), scale: new RNAnimated.Value(0),
      angle: (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
      distance: 70 + Math.random() * 160,
      size: 6 + Math.random() * 14,
      color: WORLD_COLORS[i % 6],
      isStar: Math.random() > 0.3,
      delay: (i % 6) * 200 + Math.random() * 200, // Stagger by world
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    RNAnimated.timing(backdrop, { toValue: 1, duration: 500, useNativeDriver: false }).start();

    // World rings burst in sequence — one per world color
    worldRings.forEach((r, i) => {
      RNAnimated.sequence([
        RNAnimated.delay(300 + i * 250),
        RNAnimated.timing(r, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ]).start();
    });

    // Crown after all rings
    RNAnimated.sequence([
      RNAnimated.delay(1800),
      RNAnimated.spring(crownScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: false }),
    ]).start();

    // Golden shimmer pulse
    RNAnimated.sequence([
      RNAnimated.delay(2000),
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(shimmerOpacity, { toValue: 0.15, duration: 1000, useNativeDriver: false }),
          RNAnimated.timing(shimmerOpacity, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      ),
    ]).start();

    // Title
    RNAnimated.sequence([
      RNAnimated.delay(2200),
      RNAnimated.parallel([
        RNAnimated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        RNAnimated.spring(titleScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      ]),
    ]).start();

    // Stats
    RNAnimated.sequence([
      RNAnimated.delay(2800),
      RNAnimated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();

    // Button
    RNAnimated.sequence([
      RNAnimated.delay(3200),
      RNAnimated.parallel([
        RNAnimated.spring(btnY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: false }),
        RNAnimated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
    ]).start();

    // Particles
    particles.forEach(p => {
      var dx = Math.cos(p.angle) * p.distance;
      var dy = Math.sin(p.angle) * p.distance - 30;
      RNAnimated.sequence([
        RNAnimated.delay(600 + p.delay),
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: dx, duration: 800, useNativeDriver: false }),
          RNAnimated.timing(p.y, { toValue: dy, duration: 800, useNativeDriver: false }),
          RNAnimated.sequence([
            RNAnimated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: false }),
            RNAnimated.delay(400),
            RNAnimated.timing(p.opacity, { toValue: 0, duration: 250, useNativeDriver: false }),
          ]),
          RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: false }),
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
        RNAnimated.delay(200),
        RNAnimated.timing(crownScale, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
      RNAnimated.sequence([
        RNAnimated.delay(300),
        RNAnimated.timing(backdrop, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;
  var maxRing = Math.max(SW, SH);

  return (
    <Modal visible transparent animationType="none">
      <View style={StyleSheet.absoluteFill}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(5,5,20,0)', 'rgba(5,5,20,0.92)'] }),
        }]} />

        {/* Golden shimmer */}
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: '#D4A012', opacity: shimmerOpacity,
        }]} />

        {/* 6 world-colored rings */}
        {worldRings.map((r, i) => (
          <RNAnimated.View key={i} style={{
            position: 'absolute', left: cx - maxRing / 2, top: cy - maxRing / 2,
            width: maxRing, height: maxRing, borderRadius: maxRing / 2,
            borderWidth: 3, borderColor: WORLD_COLORS[i],
            opacity: r.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.5 + i * 0.12] }) }],
          }} />
        ))}

        {/* Particles */}
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

        {/* Golden crown */}
        <RNAnimated.View style={{
          position: 'absolute', left: cx - 44, top: cy - 44,
          width: 88, height: 88, borderRadius: 24,
          backgroundColor: '#D4A012', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#D4A012', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 40,
          transform: [{ scale: crownScale }],
        }}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Path d="M3,18 L5,8 L9,13 L12,5 L15,13 L19,8 L21,18 Z" fill="white" />
          </Svg>
        </RNAnimated.View>

        {/* Title */}
        <RNAnimated.View style={{
          position: 'absolute', left: 20, right: 20, top: cy + 65, alignItems: 'center',
          opacity: titleOpacity, transform: [{ scale: titleScale }],
        }}>
          <Text style={s.masterLabel}>{t('celebrations.campaign_master_label')}</Text>
          <Text style={s.title}>{t('celebrations.campaign_master_title')}</Text>
        </RNAnimated.View>

        {/* Stats */}
        <RNAnimated.View style={{ position: 'absolute', left: 20, right: 20, top: cy + 165, alignItems: 'center', opacity: statsOpacity }}>
          <Text style={s.statsText}>{t('celebrations.campaign_all_levels_complete')}</Text>
          <View style={s.starRow}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="#D4A012" /></Svg>
            <Text style={s.starCount}>{totalStars} / {maxStars}</Text>
          </View>
        </RNAnimated.View>

        {/* Button */}
        <RNAnimated.View style={{
          position: 'absolute', left: Math.max(20, (SW - 280) / 2), right: Math.max(20, (SW - 280) / 2),
          bottom: SH * 0.12, opacity: btnOpacity, transform: [{ translateY: btnY }],
        }}>
          <Pressable style={s.btn} onPress={handleDismiss}>
            <Text style={s.btnText}>{t('celebrations.campaign_master_cta')}</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default CampaignCompleteCelebration;

var s = StyleSheet.create({
  masterLabel: { fontSize: 14, fontWeight: '900', color: '#D4A012', letterSpacing: 6, marginBottom: 4 },
  title: { fontSize: 38, fontWeight: '900', color: '#FFFFFF' },
  statsText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starCount: { fontSize: 18, fontWeight: '800', color: '#D4A012' },
  btn: {
    backgroundColor: '#D4A012', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    shadowColor: '#D4A012', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 25,
  },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
