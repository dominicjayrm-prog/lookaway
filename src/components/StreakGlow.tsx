/**
 * Golden glow effect that appears around the game area when the player
 * gets 5+ correct answers in a row. Intensifies at 10, 15, 20.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';

interface Props {
  streak: number;
}

function StreakGlow({ streak }: Props) {
  var glowOpacity = useRef(new RNAnimated.Value(0)).current;
  var badgeScale = useRef(new RNAnimated.Value(0)).current;
  var badgeOpacity = useRef(new RNAnimated.Value(0)).current;

  var isActive = streak >= 5;
  var tier = streak >= 20 ? 4 : streak >= 15 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1 : 0;
  var intensity = [0, 0.08, 0.14, 0.2, 0.28][tier];
  var color = tier >= 3 ? '#D4A012' : '#6C5CE7';
  var showBadge = streak === 5 || streak === 10 || streak === 15 || streak === 20;

  useEffect(() => {
    if (isActive) {
      // Pulse glow
      RNAnimated.sequence([
        RNAnimated.timing(glowOpacity, { toValue: intensity + 0.1, duration: 200, useNativeDriver: false }),
        RNAnimated.timing(glowOpacity, { toValue: intensity, duration: 400, useNativeDriver: false }),
      ]).start();
    } else {
      RNAnimated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }
  }, [streak, isActive]);

  useEffect(() => {
    if (showBadge) {
      badgeScale.setValue(0);
      badgeOpacity.setValue(0);
      RNAnimated.parallel([
        RNAnimated.spring(badgeScale, { toValue: 1, friction: 3, tension: 250, useNativeDriver: false }),
        RNAnimated.timing(badgeOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();

      // Auto-hide badge after 1.5s
      var timer = setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(badgeScale, { toValue: 0, duration: 200, useNativeDriver: false }),
          RNAnimated.timing(badgeOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
        ]).start();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [showBadge, streak]);

  if (!isActive) return null;

  return (
    <>
      {/* Edge glow — 4 borders */}
      <RNAnimated.View style={[st.glowTop, { backgroundColor: color, opacity: glowOpacity }]} pointerEvents="none" />
      <RNAnimated.View style={[st.glowBottom, { backgroundColor: color, opacity: glowOpacity }]} pointerEvents="none" />
      <RNAnimated.View style={[st.glowLeft, { backgroundColor: color, opacity: glowOpacity }]} pointerEvents="none" />
      <RNAnimated.View style={[st.glowRight, { backgroundColor: color, opacity: glowOpacity }]} pointerEvents="none" />

      {/* Streak badge */}
      {showBadge && (
        <RNAnimated.View style={[st.badge, {
          backgroundColor: color,
          opacity: badgeOpacity,
          transform: [{ scale: badgeScale }],
        }]} pointerEvents="none">
          <Text style={st.badgeText}>{streak}x STREAK!</Text>
        </RNAnimated.View>
      )}
    </>
  );
}

export default StreakGlow;

var st = StyleSheet.create({
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  glowBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  glowLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, borderRadius: 2 },
  glowRight: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, borderRadius: 2 },
  badge: {
    position: 'absolute', top: '45%', alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    shadowColor: '#D4A012', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15,
  },
  badgeText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
});
