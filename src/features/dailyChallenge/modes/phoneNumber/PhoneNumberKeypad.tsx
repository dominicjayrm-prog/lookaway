/**
 * Custom numeric keypad for Phone Number recall.
 *
 * Built rather than reusing the OS keyboard so we can control the
 * styling, haptic feel, and key spacing precisely. The OS keypad on
 * iOS web also doesn't render in the right place inside a Modal,
 * which broke the flow during early prototyping.
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';

interface Props {
  onDigit: (digit: number) => void;
  onBackspace: () => void;
  /** Visually disable all keys once the recall is auto-submitting. */
  disabled?: boolean;
}

const ROWS: (number | 'back' | null)[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [null, 0, 'back'],
];

const isWeb = Platform.OS === 'web';

function tap() {
  if (!isWeb) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function PhoneNumberKeypad({ onDigit, onBackspace, disabled }: Props) {
  const { colors } = useTheme();

  const handleDigit = useCallback((d: number) => {
    if (disabled) return;
    tap();
    onDigit(d);
  }, [disabled, onDigit]);

  const handleBack = useCallback(() => {
    if (disabled) return;
    tap();
    onBackspace();
  }, [disabled, onBackspace]);

  return (
    <View style={s.keypad} accessibilityLabel="Numeric keypad">
      {ROWS.map((row, ri) => (
        <View key={ri} style={s.row}>
          {row.map((cell, ci) => {
            if (cell === null) return <View key={ci} style={s.keySlot} />;
            if (cell === 'back') {
              return (
                <Pressable
                  key={ci}
                  onPress={handleBack}
                  disabled={disabled}
                  style={({ pressed }) => [
                    s.keySlot,
                    s.key,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                    disabled && { opacity: 0.4 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Backspace"
                >
                  <Ionicons name="backspace-outline" size={24} color={colors.textMid} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={ci}
                onPress={() => handleDigit(cell)}
                disabled={disabled}
                style={({ pressed }) => [
                  s.keySlot,
                  s.key,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                  disabled && { opacity: 0.4 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Digit ${cell}`}
              >
                <Text style={[s.keyLabel, { color: colors.text }]}>{cell}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  keypad: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  keySlot: { flex: 1, aspectRatio: 1.4, borderRadius: 16 },
  key: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 1,
  },
  keyLabel: { fontSize: 28, fontWeight: '700' },
});
