import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { useGameStore, LIFE_REGEN_MS } from '@/src/store/gameStore';
import { LIVES_CONFIG } from '@/src/utils/scoring';

interface OutOfLivesModalProps { visible: boolean; onClose: () => void; }

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function OutOfLivesModalInner({ visible, onClose }: OutOfLivesModalProps) {
  const livesLastLostAt = useGameStore((s) => s.livesLastLostAt);
  const gems = useGameStore((s) => s.gems);
  const refillLivesWithGems = useGameStore((s) => s.refillLivesWithGems);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!visible) return;
    function update() {
      if (!livesLastLostAt) { setCountdown('00:00'); return; }
      setCountdown(formatCountdown(livesLastLostAt + LIFE_REGEN_MS - Date.now()));
    }
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [visible, livesLastLostAt]);

  const handleCashRefill = useCallback(() => {
    Alert.alert('Coming soon', 'In-app purchases will be available soon!');
  }, []);

  const handleGemRefill = useCallback(() => {
    const ok = refillLivesWithGems();
    if (!ok) {
      Alert.alert('Not enough gems', `You need ${LIVES_CONFIG.gemRefillCost} gems to refill lives.`);
      return;
    }
    onClose();
  }, [refillLivesWithGems, onClose]);

  const heartIcon = String.fromCodePoint(0x1F494);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Broken hearts */}
          <Text style={styles.heartsRow}>{heartIcon}{heartIcon}{heartIcon}{heartIcon}{heartIcon}</Text>
          <Text style={styles.title}>Out of lives!</Text>
          <Text style={styles.countdown}>Next free life in {countdown}</Text>

          {/* Primary: £0.99 cash refill (most prominent) */}
          <Pressable style={styles.cashButton} onPress={handleCashRefill}>
            <Ionicons name="heart" size={20} color="#FFFFFF" style={{ marginRight: spacing.sm }} />
            <Text style={styles.cashButtonText}>Refill all 5 lives</Text>
            <Text style={styles.cashPrice}>{'\u00A3'}0.99</Text>
          </Pressable>

          {/* Secondary: Gem refill (de-emphasised) */}
          <Pressable
            style={[styles.gemButton, gems < LIVES_CONFIG.gemRefillCost && { opacity: 0.4 }]}
            onPress={handleGemRefill}
            disabled={gems < LIVES_CONFIG.gemRefillCost}
          >
            <Ionicons name="heart-outline" size={18} color={colors.textMid} style={{ marginRight: spacing.sm }} />
            <Text style={styles.gemButtonText}>Refill with gems</Text>
            <Text style={styles.gemCost}>{String.fromCodePoint(0x1F48E)} {LIVES_CONFIG.gemRefillCost}</Text>
          </Pressable>

          {/* Dismiss */}
          <Pressable style={styles.ghostButton} onPress={onClose}>
            <Text style={styles.ghostButtonText}>No thanks, I'll wait</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: spacing.xxl, width: '100%', maxWidth: 340, alignItems: 'center' },
  heartsRow: { fontSize: 28, letterSpacing: 4, marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm },
  countdown: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textMid, marginBottom: spacing.xxl },

  // £0.99 button — big, purple, prominent
  cashButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent,
    borderRadius: borderRadius.md, paddingVertical: 16, paddingHorizontal: spacing.lg,
    width: '100%', marginBottom: spacing.md,
  },
  cashButtonText: { flex: 1, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: '#FFFFFF' },
  cashPrice: { fontSize: typography.sizes.lg, fontWeight: typography.weights.heavy, color: '#FFFFFF' },

  // Gem button — smaller, grey, de-emphasised
  gemButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    width: '100%', marginBottom: spacing.lg,
  },
  gemButtonText: { flex: 1, fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textMid },
  gemCost: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textMid },

  ghostButton: { paddingVertical: spacing.sm },
  ghostButtonText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textLight },
});

export const OutOfLivesModal = React.memo(OutOfLivesModalInner);
