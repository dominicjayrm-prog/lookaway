import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { POWER_UPS } from '@/src/data/powerUps';

interface SlowTimeButtonProps {
  used: boolean;
  onUse: () => void;
  disabled?: boolean;
}

export const SlowTimeButton = React.memo(function SlowTimeButton({ used, onUse, disabled }: SlowTimeButtonProps) {
  const { colors } = useTheme();
  const count = useGameStore((s) => s.powerUps.slowTime);
  const def = POWER_UPS.slowTime;

  if (disabled) return null;

  const available = count > 0 && !used;

  return (
    <Pressable
      style={[styles.button, {
        backgroundColor: used ? colors.surface : def.bgColor,
        borderColor: used ? colors.border : def.color + '25',
      }]}
      onPress={() => !used && onUse()}
      disabled={used}
    >
      {used ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.textLight} />
      ) : (
        <Ionicons name="timer-outline" size={18} color={available ? def.color : colors.textLight} />
      )}
      <Text style={[styles.text, { color: used ? colors.textLight : available ? def.color : colors.textLight }]}>
        {used ? 'Used' : '+3s'}
      </Text>
      {!used && (
        <Text style={[styles.count, { color: available ? def.color + '99' : colors.textLight }]}>
          {count > 0 ? `(${count})` : `\u{1F48E}${def.cost}`}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  text: { fontSize: 13, fontWeight: '700' },
  count: { fontSize: 10, fontWeight: '600' },
});
