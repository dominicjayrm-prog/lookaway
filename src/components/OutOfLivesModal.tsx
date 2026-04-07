import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { useGameStore, LIFE_REGEN_MS } from '@/src/store/gameStore';
import { LIVES_CONFIG } from '@/src/utils/scoring';

interface OutOfLivesModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToShop?: () => void;
  onGoToBlankedPlus?: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function OutOfLivesModalInner({ visible, onClose, onGoToShop, onGoToBlankedPlus }: OutOfLivesModalProps) {
  const { colors } = useTheme();
  const livesLastLostAt = useGameStore((s) => s.livesLastLostAt);
  const gems = useGameStore((s) => s.gems);
  const refillLivesWithGems = useGameStore((s) => s.refillLivesWithGems);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!visible) return;
    function update() {
      if (!livesLastLostAt) { setCountdown('00:00'); return; }
      const remaining = livesLastLostAt + LIFE_REGEN_MS - Date.now();
      setCountdown(formatCountdown(remaining));
      // Auto-close if a life regenerated
      if (remaining <= 0) onClose();
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [visible, livesLastLostAt, onClose]);

  const handleGemRefill = useCallback(() => {
    const ok = refillLivesWithGems();
    if (!ok) return;
    onClose();
  }, [refillLivesWithGems, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={[st.card, { backgroundColor: colors.card }]}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <AnimatedBlink expression="sad" size={60} entrance="bounce" />
          </View>
          {/* Empty hearts */}
          <View style={st.heartsRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <Ionicons key={i} name="heart-outline" size={24} color={colors.wrong} style={{ opacity: 0.4 }} />
            ))}
          </View>

          <Text style={[st.title, { color: colors.text }]}>Out of lives!</Text>
          <Text style={[st.countdown, { color: colors.textMid }]}>
            Next free life in <Text style={{ fontWeight: '800', color: colors.text }}>{countdown}</Text>
          </Text>

          {/* Option 1: Buy lives (shop) */}
          <Pressable
            style={({ pressed }) => [st.shopBtn, { borderColor: colors.accent }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={onGoToShop}
          >
            <Ionicons name="heart" size={16} color={colors.accent} />
            <Text style={[st.shopBtnText, { color: colors.accent }]}>Tired of waiting?</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} style={{ opacity: 0.5 }} />
          </Pressable>

          {/* Option 2: Gem refill */}
          <Pressable
            style={({ pressed }) => [st.gemBtn, { backgroundColor: colors.surface }, gems < LIVES_CONFIG.gemRefillCost && { opacity: 0.35 }, pressed && { opacity: 0.85 }]}
            onPress={handleGemRefill}
            disabled={gems < LIVES_CONFIG.gemRefillCost}
          >
            <Ionicons name="diamond" size={14} color={colors.textMid} />
            <Text style={[st.gemBtnText, { color: colors.textMid }]}>
              Refill with {LIVES_CONFIG.gemRefillCost} gems
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={[st.divider, { backgroundColor: colors.border }]} />

          {/* Option 3: Blanked+ upsell */}
          <Pressable
            style={({ pressed }) => [st.plusBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={onGoToBlankedPlus}
          >
            <View style={st.plusIcon}>
              <Ionicons name="eye" size={14} color="#6C5CE7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.plusTitle}>Never lose a life again</Text>
              <Text style={st.plusSub}>Unlimited lives with Blanked+</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
          </Pressable>

          {/* Dismiss */}
          <Pressable style={st.waitBtn} onPress={onClose}>
            <Text style={[st.waitText, { color: colors.textLight }]}>I'll wait</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  heartsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  countdown: { fontSize: 14, marginBottom: 20 },

  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1.5, marginBottom: 10,
  },
  shopBtnText: { flex: 1, fontSize: 14, fontWeight: '700' },

  gemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 14,
  },
  gemBtnText: { fontSize: 13, fontWeight: '600' },

  divider: { width: '80%', height: 1, marginBottom: 14 },

  plusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: '#6C5CE7',
    marginBottom: 12,
  },
  plusIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  plusTitle: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  plusSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  waitBtn: { paddingVertical: 8 },
  waitText: { fontSize: 13, fontWeight: '600' },
});

export const OutOfLivesModal = React.memo(OutOfLivesModalInner);
