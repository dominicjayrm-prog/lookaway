import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { POWER_UPS, iconForPowerUp } from '@/src/data/powerUps';
import type { PowerUpId } from '@/src/utils/scoring';
import { spacing, borderRadius } from '@/src/theme/spacing';

interface BuyPowerUpPopupProps {
  powerUpId: PowerUpId | null;
  onClose: () => void;
  onBought: (id: PowerUpId) => void;
}

const GEM = String.fromCodePoint(0x1f48e);

export const BuyPowerUpPopup = React.memo(function BuyPowerUpPopup({ powerUpId, onClose, onBought }: BuyPowerUpPopupProps) {
  const { colors } = useTheme();
  const gems = useGameStore((s) => s.gems);
  const buyPowerUp = useGameStore((s) => s.buyPowerUp);

  if (!powerUpId) return null;
  const def = POWER_UPS[powerUpId];
  const canAfford1 = gems >= def.cost;
  const canAfford3 = gems >= def.bundleCost;

  const handleBuy = (qty: number) => {
    const success = buyPowerUp(powerUpId, qty);
    if (success) onBought(powerUpId);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Ionicons name={iconForPowerUp(def.icon) as keyof typeof Ionicons.glyphMap} size={32} color={def.color} style={{ marginBottom: 8 }} />
          <Text style={[styles.name, { color: colors.text }]}>{def.name}</Text>
          <Text style={[styles.desc, { color: colors.textMid }]}>{def.description}</Text>
          <Text style={[styles.remaining, { color: colors.wrong }]}>{t('buy_powerup_popup.remaining_zero')}</Text>

          <Pressable
            style={[styles.buyBtn, { backgroundColor: canAfford1 ? colors.accent : colors.surface }]}
            onPress={() => canAfford1 && handleBuy(1)}
            disabled={!canAfford1}
          >
            <Text style={[styles.buyBtnText, { color: canAfford1 ? '#FFF' : colors.textLight }]}>{t('buy_powerup_popup.buy_one')}</Text>
            <Text style={[styles.buyBtnCost, { color: canAfford1 ? '#FFF' : colors.textLight }]}>{GEM} {def.cost}</Text>
          </Pressable>

          <Pressable
            style={[styles.bundleBtn, { borderColor: canAfford3 ? colors.accent : colors.border }]}
            onPress={() => canAfford3 && handleBuy(def.bundleSize)}
            disabled={!canAfford3}
          >
            <Text style={[styles.bundleBtnText, { color: canAfford3 ? colors.accent : colors.textLight }]}>{t('social.buy_n', { count: def.bundleSize })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.bundleBtnCost, { color: canAfford3 ? colors.accent : colors.textLight }]}>{GEM} {def.bundleCost}</Text>
              <View style={[styles.discountBadge, { backgroundColor: colors.correctSoft }]}>
                <Text style={[styles.discountText, { color: colors.correct }]}>-10%</Text>
              </View>
            </View>
          </Pressable>

          <Pressable style={styles.noThanks} onPress={onClose}>
            <Text style={[styles.noThanksText, { color: colors.textLight }]}>{t('social.no_thanks')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  card: { width: '100%', maxWidth: 300, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 13, marginBottom: 8 },
  remaining: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  buyBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8 },
  buyBtnText: { fontSize: 15, fontWeight: '700' },
  buyBtnCost: { fontSize: 15, fontWeight: '700' },
  bundleBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, marginBottom: 12 },
  bundleBtnText: { fontSize: 14, fontWeight: '600' },
  bundleBtnCost: { fontSize: 14, fontWeight: '600' },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountText: { fontSize: 10, fontWeight: '700' },
  noThanks: { paddingVertical: 8 },
  noThanksText: { fontSize: 13, fontWeight: '500' },
});
