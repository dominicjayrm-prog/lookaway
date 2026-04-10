/**
 * ProfileBanner — Decorative gradient background for the profile header.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BannerCosmetic } from '@/src/data/cosmetics';

interface ProfileBannerProps {
  banner: BannerCosmetic | null;
  height?: number;
  children?: React.ReactNode;
}

function ProfileBannerComponent({ banner, height = 140, children }: ProfileBannerProps) {
  if (!banner || banner.id === 'banner_none' || banner.gradientColors[0] === 'transparent') {
    return (
      <View style={[styles.container, { height }]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={banner.gradientColors as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { height }]}
    >
      {/* Subtle pattern overlay */}
      {banner.pattern === 'stars' && (
        <View style={styles.patternOverlay}>
          {[0.15, 0.45, 0.72, 0.88].map((left, i) => (
            <View key={i} style={[styles.patternDot, { left: `${left * 100}%`, top: `${(20 + i * 18) % 80}%`, opacity: 0.15 + i * 0.05 }]} />
          ))}
        </View>
      )}
      {children}
    </LinearGradient>
  );
}

export const ProfileBanner = React.memo(ProfileBannerComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  patternDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
