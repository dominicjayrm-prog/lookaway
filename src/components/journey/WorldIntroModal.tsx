import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';

interface Props {
  world: WorldTheme | null;
  onClose: () => void;
}

/** Full-screen "Welcome to <World>" celebration shown once per world
 *  when the player crosses into a new theme. Dismissing marks the
 *  hasSeenWorldIntro flag so it never re-fires. */
export function WorldIntroModal({ world, onClose }: Props) {
  const visible = !!world;
  if (!world) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }
  const meta = WORLD_THEMES[world];
  const visuals = WORLD_VISUALS[world];
  const [start, end] = meta.range;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <LinearGradient
          colors={visuals.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.card}
        >
          <Text style={st.eyebrow}>
            WORLD {meta.worldNumber} OF {WORLD_THEME_ORDER.length} · UNLOCKED
          </Text>
          <Text style={st.title}>{meta.name}</Text>
          <Text style={st.range}>Levels {start} – {end}</Text>
          <Text style={st.atmosphere}>{visuals.atmosphere}</Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              st.cta,
              { backgroundColor: '#FFFFFF', opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Enter ${meta.name}`}
          >
            <Text style={[st.ctaText, { color: meta.color }]}>Enter →</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  range: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  atmosphere: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  cta: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
