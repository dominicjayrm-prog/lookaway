/**
 * Shared animation utilities for premium celebration effects.
 * Provides reusable particle burst, expanding ring, and spring presets
 * so every celebration in the app feels consistent and polished.
 */
import { Animated, Dimensions } from 'react-native';

var { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Generate particle config for a radial burst effect */
export function createParticles(count: number, colors: string[]) {
  return Array.from({ length: count }, (_, i) => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    rotation: new Animated.Value(0),
    angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6,
    distance: 50 + Math.random() * 130,
    size: 5 + Math.random() * 13,
    color: colors[Math.floor(Math.random() * colors.length)],
    isStar: Math.random() > 0.4,
    delay: Math.random() * 350,
  }));
}

/** Animate particles bursting outward from center */
export function animateParticleBurst(
  particles: ReturnType<typeof createParticles>,
  startDelay = 0,
) {
  return particles.map(p => {
    var dx = Math.cos(p.angle) * p.distance;
    var dy = Math.sin(p.angle) * p.distance - 30; // slight upward bias

    return Animated.sequence([
      Animated.delay(startDelay + p.delay),
      Animated.parallel([
        Animated.timing(p.x, { toValue: dx, duration: 700, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: dy, duration: 700, useNativeDriver: true }),
        Animated.timing(p.rotation, { toValue: 360, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.delay(350),
          Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
          Animated.delay(250),
          Animated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]),
    ]);
  });
}

/** Create expanding ring animations */
export function createRings(count: number) {
  return Array.from({ length: count }, () => new Animated.Value(0));
}

export function animateRings(rings: Animated.Value[], color: string, startDelay = 0) {
  return rings.map((r, i) =>
    Animated.sequence([
      Animated.delay(startDelay + i * 150),
      Animated.timing(r, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])
  );
}

/** Spring scale entrance */
export function springIn(value: Animated.Value, delay = 0, friction = 4, tension = 200) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.spring(value, { toValue: 1, friction, tension, useNativeDriver: true }),
  ]);
}

/** Fade in with optional delay */
export function fadeIn(value: Animated.Value, delay = 0, duration = 300) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.timing(value, { toValue: 1, duration, useNativeDriver: true }),
  ]);
}

/** Slide up with spring */
export function slideUp(yValue: Animated.Value, opacityValue: Animated.Value, delay = 0) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.parallel([
      Animated.spring(yValue, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityValue, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]),
  ]);
}

/** Stagger fade out — for smooth dismiss */
export function staggerFadeOut(values: { opacity: Animated.Value; scale?: Animated.Value }[], interval = 80) {
  return values.map((v, i) =>
    Animated.sequence([
      Animated.delay(i * interval),
      Animated.parallel([
        Animated.timing(v.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ...(v.scale ? [Animated.timing(v.scale, { toValue: 0.8, duration: 200, useNativeDriver: true })] : []),
      ]),
    ])
  );
}

/** App color palette for celebrations */
export var CELEBRATION_COLORS = {
  purple: ['#6C5CE7', '#A29BFE', '#D4A012', '#00B894', '#FF6B6B', '#0984E3'],
  gold: ['#D4A012', '#F9CA24', '#FFD700', '#FFA500', '#E17055', '#FFFFFF'],
  worldColors: {
    1: ['#00B894', '#55EFC4', '#D4A012', '#FFFFFF'],
    2: ['#0984E3', '#74B9FF', '#D4A012', '#FFFFFF'],
    3: ['#6C5CE7', '#A29BFE', '#D4A012', '#FFFFFF'],
    4: ['#F9A825', '#FDCB6E', '#D4A012', '#FFFFFF'],
    5: ['#FF6B6B', '#FD79A8', '#D4A012', '#FFFFFF'],
    6: ['#1A1A18', '#636E72', '#D4A012', '#FFFFFF'],
  } as Record<number, string[]>,
};
