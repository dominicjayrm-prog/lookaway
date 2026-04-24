import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Blink } from '@/src/components/Blink';
import { useGameStore } from '@/src/store';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Legendary Level 380 completion celebration. Shown once when the
 *  player clears the final Mastermind level. Gold-themed to match the
 *  Mastermind reward aesthetic. */
export function BrainMasterCelebration({ visible, onClose }: Props) {
  const { totalStars, streakCount } = useGameStore();

  const share = async () => {
    try {
      await Share.share({
        message: `I just finished all 380 levels of BLANKED. ${totalStars} stars, ${streakCount}-day streak. Brain Master. 🧠👑`,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <LinearGradient colors={['#FFD700', '#D4A012', '#8B6914']} style={st.overlay}>
        <View style={st.content}>
          <Text style={st.eyebrow}>LEVEL 380 · COMPLETE</Text>
          <Text style={st.title}>BRAIN MASTER</Text>

          <View style={st.blinkWrap}>
            <Blink expression="celebrate" size={180} />
          </View>

          <Text style={st.blurb}>
            You walked from the grove to the core. Every mode, every world.
            You are in the top 0.3% of Blanked minds.
          </Text>

          <View style={st.statsRow}>
            <View style={st.stat}>
              <Text style={st.statValue}>{totalStars}</Text>
              <Text style={st.statLabel}>STARS</Text>
            </View>
            <View style={st.stat}>
              <Text style={st.statValue}>380</Text>
              <Text style={st.statLabel}>LEVELS</Text>
            </View>
            <View style={st.stat}>
              <Text style={st.statValue}>{streakCount}</Text>
              <Text style={st.statLabel}>DAY STREAK</Text>
            </View>
          </View>

          <Pressable
            onPress={share}
            style={({ pressed }) => [
              st.shareBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share your journey"
          >
            <Text style={st.shareText}>Share your journey</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              st.closeBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={st.closeText}>Done</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  blinkWrap: {
    marginBottom: 20,
  },
  blurb: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    marginBottom: 12,
  },
  shareText: {
    color: '#8B6914',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  closeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
  },
});
