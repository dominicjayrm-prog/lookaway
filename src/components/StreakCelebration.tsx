import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated } from 'react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { getNextMilestone } from '@/src/data/streakMilestones';

interface StreakCelebrationProps {
  visible: boolean;
  days: number;
  gems: number;
  title: string;
  color: string;
  onDismiss: () => void;
}

function FireIcon({ size = 48, color = '#FF9500' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 23c-3.9 0-7-3.1-7-7 0-2.1 1.1-4.5 2.5-6.2C9 8 10 6 10 4c0-.3 0-.5-.1-.7C11.3 4 13 5 14 6.5c.7 1 1 2.2 1 3.5-1.1-.5-2-.5-2.5.2-.5.8 0 2 1 3 1.4 1.4 2.5 3.2 2.5 5.3 0 3.9-3.1 4.5-4 4.5z" fill={color} /></Svg>;
}

function GemIcon({ size = 28 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,9 18,22 6,22 2,9" fill="#6C5CE7" stroke="#A29BFE" strokeWidth={0.5} /><Path d="M2,9 L22,9 M6,22 L12,9 L18,22 M12,2 L8,9 M12,2 L16,9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} /></Svg>;
}

function useCountUp(target: number, duration: number = 800, startDelay: number = 700): number {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), startDelay); return () => clearTimeout(t); }, [startDelay]);
  useEffect(() => {
    if (!started || target === 0) return;
    const startTime = Date.now();
    let frame: number;
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);
  return value;
}

export const StreakCelebration = React.memo(function StreakCelebration({ visible, days, gems, title, color, onDismiss }: StreakCelebrationProps) {
  const { colors } = useTheme();
  const gemCount = useCountUp(visible ? gems : 0, 800, 700);
  const nextMilestone = getNextMilestone(days);

  // Staggered entrance animations
  const iconScale = useRef(new RNAnimated.Value(0)).current;
  const textOpacity = useRef(new RNAnimated.Value(0)).current;
  const textSlide = useRef(new RNAnimated.Value(20)).current;
  const badgeOpacity = useRef(new RNAnimated.Value(0)).current;
  const badgeScale = useRef(new RNAnimated.Value(0.8)).current;
  const gemOpacity = useRef(new RNAnimated.Value(0)).current;
  const gemSlide = useRef(new RNAnimated.Value(-30)).current;
  const buttonOpacity = useRef(new RNAnimated.Value(0)).current;
  const nextOpacity = useRef(new RNAnimated.Value(0)).current;

  // Particles
  const particles = useRef(Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 80 + Math.random() * 60;
    return {
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(1),
      endX: Math.cos(angle) * dist,
      endY: Math.sin(angle) * dist - 40,
      size: 4 + Math.random() * 4,
      color: [color, '#D4A012', '#FFFFFF', color][i % 4],
      delay: Math.random() * 300,
    };
  })).current;

  useEffect(() => {
    if (!visible) return;
    // Reset
    iconScale.setValue(0); textOpacity.setValue(0); textSlide.setValue(20);
    badgeOpacity.setValue(0); badgeScale.setValue(0.8);
    gemOpacity.setValue(0); gemSlide.setValue(-30);
    buttonOpacity.setValue(0); nextOpacity.setValue(0);
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(1); });

    // Icon (0ms)
    RNAnimated.spring(iconScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }).start();

    // Text (200ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        RNAnimated.spring(textSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 200);

    // Badge (400ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(badgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(badgeScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 400);

    // Gems (700ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(gemOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(gemSlide, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 700);

    // Button (1200ms)
    setTimeout(() => RNAnimated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(), 1200);

    // Next milestone (1400ms)
    setTimeout(() => RNAnimated.timing(nextOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(), 1400);

    // Particles (0ms, staggered)
    particles.forEach(p => {
      setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: p.endX, duration: 1500, useNativeDriver: true }),
          RNAnimated.timing(p.y, { toValue: p.endY, duration: 1500, useNativeDriver: true }),
          RNAnimated.timing(p.opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]).start();
      }, p.delay);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={styles.cardContainer}>
          {/* Particles */}
          {particles.map((p, i) => (
            <RNAnimated.View key={i} style={[styles.particle, { width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color, opacity: p.opacity, transform: [{ translateX: p.x }, { translateY: p.y }] }]} />
          ))}

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Fire icon */}
            <RNAnimated.View style={{ transform: [{ scale: iconScale }] }}>
              <AnimatedBlink expression="streak" size={56} />
            </RNAnimated.View>

            {/* Streak text */}
            <RNAnimated.View style={{ opacity: textOpacity, transform: [{ translateY: textSlide }], alignItems: 'center' }}>
              <Text style={[styles.streakNumber, { color }]}>{days}-DAY</Text>
              <Text style={[styles.streakLabel, { color: colors.text }]}>STREAK!</Text>
            </RNAnimated.View>

            {/* Title badge */}
            <RNAnimated.View style={[styles.titleBadge, { backgroundColor: color + '18', opacity: badgeOpacity, transform: [{ scale: badgeScale }] }]}>
              <Text style={[styles.titleText, { color }]}>{title}</Text>
            </RNAnimated.View>

            {/* Gem reward */}
            <RNAnimated.View style={[styles.gemRow, { opacity: gemOpacity, transform: [{ translateY: gemSlide }] }]}>
              <GemIcon size={28} />
              <Text style={styles.gemText}>+{gemCount} gems</Text>
            </RNAnimated.View>

            {/* Keep it up button */}
            <RNAnimated.View style={{ opacity: buttonOpacity, width: '100%', maxWidth: 240 }}>
              <Pressable style={[styles.button, { backgroundColor: color }]} onPress={onDismiss}>
                <Text style={styles.buttonText}>Keep it up!</Text>
              </Pressable>
            </RNAnimated.View>

            {/* Next milestone */}
            <RNAnimated.View style={{ opacity: nextOpacity }}>
              {nextMilestone ? (
                <Text style={[styles.nextText, { color: colors.textMid }]}>Next milestone: {nextMilestone.days} days (+{nextMilestone.gems} gems)</Text>
              ) : (
                <Text style={[styles.nextText, { color: colors.gold }]}>You've reached the highest streak level!</Text>
              )}
            </RNAnimated.View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cardContainer: { alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
  card: { width: 320, borderRadius: 28, padding: 36, paddingHorizontal: 28, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 60, elevation: 10 },
  streakNumber: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  streakLabel: { fontSize: 42, fontWeight: '900', letterSpacing: -1, marginTop: -8 },
  titleBadge: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 12 },
  titleText: { fontSize: 13, fontWeight: '700' },
  gemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gemText: { fontSize: 22, fontWeight: '800', color: '#6C5CE7' },
  button: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  nextText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
