import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

interface LivesIndicatorProps {
  lives: number;
  maxLives?: number;
  regenTimeLeft?: string; // e.g. "12:34"
}

export const LivesIndicator = React.memo(function LivesIndicator({
  lives,
  maxLives = 5,
  regenTimeLeft,
}: LivesIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.hearts}>
        {Array.from({ length: maxLives }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < lives ? 'heart' : 'heart-outline'}
            size={18}
            color={i < lives ? colors.wrong : colors.textLight}
          />
        ))}
      </View>
      {lives < maxLives && regenTimeLeft && (
        <Text style={styles.timer}>{regenTimeLeft}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hearts: {
    flexDirection: 'row',
    gap: 2,
  },
  timer: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textMid,
  },
});
