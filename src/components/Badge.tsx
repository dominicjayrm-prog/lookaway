import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { borderRadius, spacing } from '@/src/theme/spacing';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
}

export const Badge = React.memo(function Badge({
  label,
  color,
  bgColor,
  style,
}: BadgeProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.accent;
  const resolvedBgColor = bgColor ?? colors.accentSoft;

  return (
    <View style={[styles.badge, { backgroundColor: resolvedBgColor }, style]}>
      <Text style={[styles.text, { color: resolvedColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
