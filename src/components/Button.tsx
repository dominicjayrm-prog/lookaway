import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { borderRadius, spacing } from '@/src/theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button = React.memo(function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    // Haptics only on native — crashes on web
    if (Platform.OS !== 'web') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPress();
  }, [onPress]);

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.accent },
    secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
    ghost: { backgroundColor: 'transparent' },
  };

  const variantTextStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: '#FFFFFF' },
    secondary: { color: colors.accent },
    ghost: { color: colors.accent },
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
      <Text style={[
        styles.text,
        variantTextStyles[variant],
        disabled && { color: colors.textLight },
        textStyle,
      ]}>{title}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
});
