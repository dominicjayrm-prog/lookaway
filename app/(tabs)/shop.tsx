import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

const POWER_UPS = [
  { id: 'slow_time', icon: '⏱', name: 'Slow Time', description: '+3s viewing time', cost: 30, tint: colors.blueSoft, tintMid: 'rgba(9, 132, 227, 0.12)', tintStrong: colors.blue },
  { id: 'peek', icon: '👁', name: 'Peek', description: 'Flash scene 1s', cost: 40, tint: colors.accentSoft, tintMid: colors.accentMid, tintStrong: colors.accent },
  { id: 'fifty_fifty', icon: '✂️', name: '50/50', description: 'Remove 2 options', cost: 25, tint: colors.correctSoft, tintMid: 'rgba(0, 184, 148, 0.12)', tintStrong: colors.correct },
  { id: 'skip', icon: '⏭', name: 'Skip', description: 'Skip a question', cost: 50, tint: 'rgba(255, 165, 0, 0.06)', tintMid: 'rgba(255, 165, 0, 0.12)', tintStrong: '#E67E22' },
];

const GEM_PACKS = [
  { id: 'gems_100', gems: 100, price: '$0.99', badge: null },
  { id: 'gems_500', gems: 500, price: '$3.99', badge: 'BEST VALUE' },
  { id: 'gems_1200', gems: 1200, price: '$7.99', badge: null },
];

export default function ShopTab() {
  const { gems } = useGameStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.gemDisplay}>
          <Text style={styles.gemEmoji}>💎</Text>
          <Text style={styles.gemCount}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Power-ups</Text>
        <View style={styles.powerUpGrid}>
          {POWER_UPS.map((powerUp) => (
            <View key={powerUp.id} style={styles.powerUpCardWrapper}>
              <Card style={{ ...styles.powerUpCard, backgroundColor: powerUp.tint }}>
                <View style={[styles.powerUpIconCircle, { backgroundColor: powerUp.tintMid }]}>
                  <Text style={styles.powerUpIcon}>{powerUp.icon}</Text>
                </View>
                <Text style={styles.powerUpName}>{powerUp.name}</Text>
                <Text style={styles.powerUpDescription}>{powerUp.description}</Text>
                <View style={[styles.costPill, { backgroundColor: powerUp.tintMid }]}>
                  <Text style={styles.costGem}>💎</Text>
                  <Text style={[styles.costText, { color: powerUp.tintStrong }]}>{powerUp.cost}</Text>
                </View>
              </Card>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {GEM_PACKS.map((pack) => (
            <Card key={pack.id} style={{ ...styles.gemPackCard, paddingTop: pack.badge ? 36 : spacing.xl }}>
              {pack.badge && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>{pack.badge}</Text>
                </View>
              )}
              <Text style={styles.packGemEmoji}>💎</Text>
              <Text style={styles.packGemAmount}>{pack.gems.toLocaleString()}</Text>
              <Text style={styles.packGemsLabel}>gems</Text>
              <Button title={pack.price} variant="secondary" onPress={() => {}} style={styles.packButton} textStyle={styles.packButtonText} />
            </Card>
          ))}
        </View>

        <Card style={styles.removeAdsCard}>
          <View style={styles.removeAdsContent}>
            <View style={styles.removeAdsIconContainer}>
              <Ionicons name="eye-off-outline" size={24} color={colors.accent} />
            </View>
            <View style={styles.removeAdsTextContainer}>
              <Text style={styles.removeAdsTitle}>Remove ads</Text>
              <Text style={styles.removeAdsBody}>Remove all interstitial and banner ads forever</Text>
            </View>
          </View>
          <Button title="$4.99 \u2014 one time" onPress={() => {}} style={styles.removeAdsButton} textStyle={styles.removeAdsButtonText} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: typography.weights.heavy, color: colors.text, letterSpacing: -0.3 },
  gemDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accentSoft, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: borderRadius.pill },
  gemEmoji: { fontSize: 22 },
  gemCount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy, color: colors.accent },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  powerUpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  powerUpCardWrapper: { width: '48%', flexGrow: 1 },
  powerUpCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  powerUpIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  powerUpIcon: { fontSize: 28 },
  powerUpName: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  powerUpDescription: { fontSize: typography.sizes.sm, color: colors.textMid, textAlign: 'center' },
  costPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.pill, marginTop: spacing.xs },
  costGem: { fontSize: 12 },
  costText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  gemPackRow: { flexDirection: 'row', gap: spacing.md },
  gemPackCard: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xl, overflow: 'hidden' },
  bestValueBadge: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.accent, paddingVertical: 5, alignItems: 'center' },
  bestValueText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.heavy, color: '#FFFFFF', letterSpacing: 1 },
  packGemEmoji: { fontSize: 32 },
  packGemAmount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy, color: colors.text },
  packGemsLabel: { fontSize: typography.sizes.sm, color: colors.textMid, fontWeight: typography.weights.medium, marginTop: -4 },
  packButton: { width: '90%', minHeight: 40, paddingVertical: spacing.sm, marginTop: spacing.xs },
  packButtonText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  removeAdsCard: { marginTop: spacing.xl, marginBottom: spacing.lg },
  removeAdsContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  removeAdsIconContainer: { width: 52, height: 52, borderRadius: borderRadius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  removeAdsTextContainer: { flex: 1, gap: spacing.xs },
  removeAdsTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  removeAdsBody: { fontSize: typography.sizes.md, color: colors.textMid, lineHeight: 20 },
  removeAdsButton: { minHeight: 52, backgroundColor: colors.accent, borderRadius: borderRadius.md },
  removeAdsButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
});
