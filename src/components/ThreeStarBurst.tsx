/**
 * Golden particle burst that explodes behind the stars when a player gets 3 stars.
 * Renders as an overlay positioned relative to the star rating area.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated as RNAnimated, Dimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

var STAR_COLORS = ['#D4A012', '#F9CA24', '#FFD700', '#FFA500', '#FFFFFF', '#E17055'];

interface Props {
  /** Set to true to trigger the burst */
  trigger: boolean;
  /** Number of stars earned (only bursts on 3) */
  stars: number;
}

function ThreeStarBurst({ trigger, stars }: Props) {
  var particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(0),
      angle: (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      distance: 40 + Math.random() * 80,
      size: 6 + Math.random() * 10,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      delay: Math.random() * 200,
    }))
  ).current;

  var glowOpacity = useRef(new RNAnimated.Value(0)).current;
  var glowScale = useRef(new RNAnimated.Value(0.5)).current;

  useEffect(() => {
    if (!trigger || stars < 3) return;

    // Delay to let stars finish their entrance animation
    var timer = setTimeout(() => {
      // Golden glow pulse
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(glowOpacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
          RNAnimated.spring(glowScale, { toValue: 1.3, friction: 3, tension: 200, useNativeDriver: true }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(glowOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(glowScale, { toValue: 2, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();

      // Particle burst
      particles.forEach(p => {
        var dx = Math.cos(p.angle) * p.distance;
        var dy = Math.sin(p.angle) * p.distance - 20;

        RNAnimated.sequence([
          RNAnimated.delay(p.delay),
          RNAnimated.parallel([
            RNAnimated.timing(p.x, { toValue: dx, duration: 600, useNativeDriver: true }),
            RNAnimated.timing(p.y, { toValue: dy, duration: 600, useNativeDriver: true }),
            RNAnimated.sequence([
              RNAnimated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              RNAnimated.delay(300),
              RNAnimated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
            RNAnimated.sequence([
              RNAnimated.spring(p.scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
              RNAnimated.delay(200),
              RNAnimated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }, 700); // Wait for star 3 to land

    return () => clearTimeout(timer);
  }, [trigger, stars]);

  if (!trigger || stars < 3) return null;

  return (
    <View style={st.container} pointerEvents="none">
      {/* Golden glow */}
      <RNAnimated.View style={[st.glow, {
        opacity: glowOpacity,
        transform: [{ scale: glowScale }],
      }]} />

      {/* Star particles */}
      {particles.map((p, i) => (
        <RNAnimated.View key={i} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          marginLeft: -p.size / 2, marginTop: -p.size / 2,
          opacity: p.opacity,
          transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
        }}>
          <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
            <Polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill={p.color} />
          </Svg>
        </RNAnimated.View>
      ))}
    </View>
  );
}

export default ThreeStarBurst;

var st = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D4A012',
  },
});
