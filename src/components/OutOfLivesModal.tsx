import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { useGameStore, LIFE_REGEN_MS } from '@/src/store/gameStore';

interface OutOfLivesModalProps { visible: boolean; onClose: () => void; }

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function OutOfLivesModalInner({ visible, onClose }: OutOfLivesModalProps) {
  const livesLastLostAt = useGameStore((s) => s.livesLastLostAt);
  const gems = useGameStore((s) => s.gems);
  const refillLives = useGameStore((s) => s.refillLives);
  const spendGems = useGameStore((s) => s.spendGems);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!visible) return;
    function update() { if (!livesLastLostAt) { setCountdown('00:00'); return; } setCountdown(formatCountdown(livesLastLostAt + LIFE_REGEN_MS - Date.now())); }
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [visible, livesLastLostAt]);

  const handleWatchAd = useCallback(() => {
    const s = useGameStore.getState();
    if (s.lives < s.maxLives) useGameStore.setState({ lives: s.lives + 1 });
    onClose();
  }, [onClose]);

  const handleRefill = useCallback(() => { const ok = spendGems(80); if (ok) refillLives(); onClose(); }, [spendGems, refillLives, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.heartsRow}>{Array.from({ length: 5 }).map((_, i) => (<Ionicons key={i} name="heart-outline" size={24} color={colors.wrong} style={i < 4 ? { marginRight: spacing.sm } : undefined} />))}</View>
          <Text style={styles.title}>Out of lives!</Text>
          <Text style={styles.countdown}>Next free life in {countdown}</Text>
          <Pressable style={styles.adButton} onPress={handleWatchAd}>
            <Ionicons name="play-circle-outline" size={20} color={colors.card} style={{ marginRight: spacing.sm }} />
            <Text style={styles.adButtonText}>Watch a short video</Text>
            <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
          </Pressable>
          <Pressable style={[styles.refillButton, gems < 80 && { opacity: 0.4 }]} onPress={handleRefill} disabled={gems < 80}>
            <Ionicons name="heart" size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
            <Text style={styles.refillButtonText}>Refill all lives</Text>
            <View style={styles.gemBadge}><Text style={styles.gemBadgeText}>80 gems</Text></View>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={onClose}><Text style={styles.ghostButtonText}>No thanks, I'll wait</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: spacing.xxl, width: '100%', maxWidth: 340, alignItems: 'center' },
  heartsRow: { flexDirection: 'row', marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm },
  countdown: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textMid, marginBottom: spacing.xxl },
  adButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.correct, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, width: '100%', marginBottom: spacing.md },
  adButtonText: { flex: 1, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.card },
  freeBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  freeBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.card },
  refillButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, width: '100%', marginBottom: spacing.lg },
  refillButtonText: { flex: 1, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.accent },
  gemBadge: { backgroundColor: colors.accentSoft, borderRadius: borderRadius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  gemBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.accent },
  ghostButton: { paddingVertical: spacing.sm },
  ghostButtonText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.textMid },
});

export const OutOfLivesModal = React.memo(OutOfLivesModalInner);
