import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { GemCounter } from '@/src/components/GemCounter';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

const GEM_PACKS = [
  { id: 'gems_100', gems: 100, price: '$0.99', popular: false },
  { id: 'gems_500', gems: 500, price: '$3.99', popular: true },
  { id: 'gems_1200', gems: 1200, price: '$7.99', popular: false },
  { id: 'gems_3000', gems: 3000, price: '$14.99', popular: false },
];

export default function ShopTab() {
  const { gems } = useGameStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <GemCounter count={gems} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gem packs */}
        <Text style={styles.sectionTitle}>Gem packs</Text>
        <View style={styles.grid}>
          {GEM_PACKS.map((pack) => (
            <Card key={pack.id} style={styles.packCard}>
              {pack.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              <Text style={styles.gemEmoji}>\uD83D\uDC8E</Text>
              <Text style={styles.gemAmount}>
                {pack.gems.toLocaleString()}
              </Text>
              <Button
                title={pack.price}
                variant="secondary"
                onPress={() => {}}
                style={styles.packButton}
              />
            </Card>
          ))}
        </View>

        {/* Remove ads */}
        <Card style={styles.removeAdsCard}>
          <View>
            <Text style={styles.removeAdsTitle}>Remove ads</Text>
            <Text style={styles.removeAdsBody}>
              Remove all interstitial and banner ads forever
            </Text>
          </View>
          <Button title="$4.99" onPress={() => {}} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  packCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  popularText: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  gemEmoji: {
    fontSize: 32,
  },
  gemAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  packButton: {
    width: '100%',
  },
  removeAdsCard: {
    gap: spacing.md,
  },
  removeAdsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  removeAdsBody: {
    fontSize: typography.sizes.md,
    color: colors.textMid,
    marginTop: spacing.xs,
  },
});
