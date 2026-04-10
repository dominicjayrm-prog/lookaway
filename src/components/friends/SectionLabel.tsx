import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing } from '@/src/theme/spacing';

/**
 * Small ALL-CAPS label used to break up the friends tab into sections
 * ("FRIEND REQUESTS", "YOUR FRIENDS (3)" etc). Extracted so every
 * section component can render one without re-declaring the style.
 */
export function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
});
