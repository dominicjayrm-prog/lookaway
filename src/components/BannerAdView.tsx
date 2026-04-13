/**
 * Banner ad strip — renders at the bottom of the level map and shop.
 *
 * Automatically hides when:
 *   - Platform is web (no AdMob SDK)
 *   - User has Blanked+ subscription
 *   - User bought Remove Ads IAP
 *
 * Uses an adaptive banner that fills the available width and picks
 * the best height automatically (typically ~50-60px).
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useGameStore } from '@/src/store';
import { AD_UNIT_IDS, ADS_SUPPORTED } from '@/src/data/adConfig';

/**
 * Lazy wrapper around BannerAd from react-native-google-mobile-ads.
 * Returns null on web or when ads should be hidden, so callers can
 * mount it unconditionally without Platform checks.
 */
export function BannerAdView() {
  const adsRemoved = useGameStore((s) => s.adsRemoved);
  const isSubscribed = useGameStore((s) => s.subscriptionStatus === 'active');

  // Don't show if user paid to remove ads or is a subscriber
  if (adsRemoved || isSubscribed) return null;

  // Web doesn't have the native module
  if (!ADS_SUPPORTED) return null;

  // Lazy import so the web bundle never resolves the native module
  try {
    const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
    return (
      <View style={styles.container}>
        <BannerAd
          unitId={AD_UNIT_IDS.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    );
  } catch {
    // Module not available — fail silently
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
  },
});
