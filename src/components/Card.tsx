import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { borderRadius, shadows, spacing } from '@/src/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export const Card = React.memo(function Card({
  children,
  style,
  padded = true,
}: CardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, padded && styles.padded, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
