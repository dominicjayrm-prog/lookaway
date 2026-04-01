import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { POWER_UPS, QUESTION_POWER_UPS } from '@/src/data/powerUps';
import type { PowerUpId } from '@/src/utils/scoring';
import { spacing, borderRadius } from '@/src/theme/spacing';
import Svg, { Polygon } from 'react-native-svg';

interface PowerUpBarProps {
  usedThisLevel: Record<PowerUpId, boolean>;
  onUsePowerUp: (id: PowerUpId) => void;
  disabled?: boolean;
}

function BoltIcon({ size = 18, color = '#6C5CE7' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} /></Svg>;
}

export const PowerUpBar = React.memo(function PowerUpBar({ usedThisLevel, onUsePowerUp, disabled }: PowerUpBarProps) {
  const { colors } = useTheme();
  const powerUps = useGameStore((s) => s.powerUps);

  const hasAny = QUESTION_POWER_UPS.some(id => powerUps[id] > 0 || usedThisLevel[id]);

  if (disabled) return null;

  // State B: player owns zero of everything
  if (!hasAny) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '25' }]}>
        <BoltIcon size={18} color={colors.accent} />
        <Text style={[styles.emptyTitle, { color: colors.accent }]}>Power-ups</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>Boost your memory in the shop</Text>
      </View>
    );
  }

  // State A: show power-up buttons
  return (
    <View style={styles.row}>
      {QUESTION_POWER_UPS.map(id => {
        const def = POWER_UPS[id];
        const count = powerUps[id];
        const used = usedThisLevel[id];
        const available = count > 0 && !used;

        return (
          <Pressable
            key={id}
            style={[styles.button, { backgroundColor: used ? colors.surface : def.bgColor, borderColor: used ? colors.border : def.color + '25' }]}
            onPress={() => !used && onUsePowerUp(id)}
            disabled={used}
          >
            {used ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.textLight} />
            ) : (
              <Ionicons name={def.icon as keyof typeof Ionicons.glyphMap} size={22} color={available ? def.color : colors.textLight} />
            )}
            <Text style={[styles.count, { color: used ? colors.textLight : available ? def.color : colors.textLight }]}>
              {used ? '\u2713' : `x${count}`}
            </Text>
            <Text style={[styles.label, { color: used ? colors.textLight : available ? def.color + 'B3' : colors.textLight }]}>
              {def.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: spacing.md },
  button: { width: 80, height: 70, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  count: { fontSize: 11, fontWeight: '700' },
  label: { fontSize: 9, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', gap: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptySubtitle: { fontSize: 12 },
});
