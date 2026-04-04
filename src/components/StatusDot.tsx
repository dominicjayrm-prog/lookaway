import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getOnlineStatus, STATUS_COLORS, type OnlineStatus } from '@/src/utils/onlineStatus';

interface StatusDotProps {
  lastActiveAt: string | null;
  size?: number;
  borderColor?: string;
}

export function StatusDot({ lastActiveAt, size = 10, borderColor = '#FFFFFF' }: StatusDotProps) {
  const status = getOnlineStatus(lastActiveAt);
  const dotColor = STATUS_COLORS[status];
  const half = size / 2;
  const borderW = Math.round(size * 0.2);

  return (
    <View style={[
      styles.dot,
      {
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: dotColor,
        borderWidth: borderW,
        borderColor,
      },
      status === 'online' ? {
        shadowColor: '#00B894',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
      } : undefined,
    ]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
});
