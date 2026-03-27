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
  { id: 'slow_time', icon: String.fromCodePoint(0x23F1), name: 'Slow Time', description: '+3s viewing time', cost: 30, tint: 'rgba(9, 132, 227, 0.08)', tintMid: 'rgba(9, 132, 227, 0.12)', tintStrong: '#0984E3' },
  { id: 'peek', icon: String.fromCodePoint(0x1F441), name: 'Peek', description: 'Flash scene 1s', cost: 40, tint: 'rgba(108, 92, 231, 0.08)', tintMid: 'rgba(108, 92, 231, 0.12)', tintStrong: '#6C5CE7' },
  { id: 'fifty_fifty', icon: String.fromCodePoint(0x2702, 0xFE0F), name: '50/50', description: 'Remove 2 options', cost: 25, tint: 'rgba(0, 184, 148, 0.08)', tintMid: 'rgba(0, 184, 148, 0.12)', tintStrong: '#00B894' },
  { id: 'skip', icon: String.fromCodePoint(0x23ED), name: 'Skip', description: 'Skip a question', cost: 50, tint: 'rgba(255, 107, 107, 0.08)', tintMid: 'rgba(255, 107, 107, 0.12)', tintStrong: '#FF6B6B' },
];

const GEM_PACKS = [
  { id: 'gems_100', gems: 100, price: '$0.99', badge: null },
  { id: 'gems_500', gems: 500, price: '$3.99', badge: 'BEST VALUE' },
  { id: 'gems_1200', gems: 1200, price: '$7.99', badge: null },
];

export default function ShopTab() {
  const { gems } = useGameStore();
  const gemEmoji = String.fromCodePoint(0x1F48E);
  const emdash = String.fromCharCode(8212);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.gemDisplay}>
          <Text style={styles.gemEmoji}>{gemEmoji}</Text>
          <Text style={styles.gemCount}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Power-ups</Text>
        <View style={styles.powerUpGrid}>
          {POWER_UPS.map((p) => (
            <View key={p.id} style={styles.powerUpCardWrapper}>
              <Card style={{ ...styles.powerUpCard, backgroundColor: p.tint }}>
                <View style={[styles.powerUpIconCircle, { backgroundColor: p.tintMid }]}>
                  <Text style={styles.powerUpIcon}>{p.icon}</Text>
                </View>
                <Text style={styles.powerUpName}>{p.name}</Text>
                <Text style={styles.powerUpDescription}>{p.description}</Text>
                <View style={[styles.costPill, { backgroundColor: p.tintMid }]}>
                  <Text style={styles.costGem}>{gemEmoji}</Text>
                  <Text style={[styles.costText, { color: p.tintStrong }]}>{p.cost}</Text>
                </View>
              </Card>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {GEM_PACKS.map((pack) => (
            <Card key={pack.id} style={{ ...styles.gemPackCard, paddingTop: pack.badge ? 36 : spacing.xl }}>
              {pack.badge && <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>{pack.badge}</Text></View>}
              <Text style={styles.packGemEmoji}>{gemEmoji}</Text>
              <Text style={styles.packGemAmount}>{pack.gems.toLocaleString()}</Text>
              <Text style={styles.packGemsLabel}>gems</Text>
              <Button title={pack.price} variant="secondary" onPress={() => {}} style={styles.packButton} textStyle={styles.packButtonText} />
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Lives</Text>
        <Card style={styles.livesCard}>
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.correctSoft }]}>
                <Ionicons name="play-circle-outline" size={22} color={colors.correct} />
              </View>
              <Text style={styles.livesRowText}>Watch ad for 1 life</Text>
            </View>
            <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
          </View>
          <View style={styles.livesDivider} />
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="heart" size={20} color={colors.accent} />
              </View>
              <Text style={styles.livesRowText}>Refill all lives</Text>
            </View>
            <View style={styles.gemCostPill}>
              <Text style={styles.gemCostEmoji}>{gemEmoji}</Text>
              <Text style={styles.gemCostText}>80</Text>
            </View>
          </View>
          <View style={styles.livesDivider} />
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="infinite" size={22} color={colors.gold} />
              </View>
              <Text style={styles.livesRowText}>Unlimited for 1 hour</Text>
            </View>
            <Text style={styles.livesPriceText}>$1.99</Text>
          </View>
        </Card>

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
          <Button title={`$4.99 ${emdash} one time`} onPress={() => {}} style={styles.removeAdsButton} textStyle={styles.removeAdsButtonText} />
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
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
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
  livesCard: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  livesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  livesRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  livesIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  livesRowText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  livesDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  freeBadge: { backgroundColor: colors.correctSoft, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.pill },
  freeBadgeText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.correct },
  gemCostPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentSoft, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.pill },
  gemCostEmoji: { fontSize: 12 },
  gemCostText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.accent },
  livesPriceText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  removeAdsCard: { marginTop: spacing.xl, marginBottom: spacing.lg },
  removeAdsContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  removeAdsIconContainer: { width: 52, height: 52, borderRadius: borderRadius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  removeAdsTextContainer: { flex: 1, gap: spacing.xs },
  removeAdsTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  removeAdsBody: { fontSize: typography.sizes.md, color: colors.textMid, lineHeight: 20 },
  removeAdsButton: { minHeight: 52, backgroundColor: colors.accent, borderRadius: borderRadius.md },
  removeAdsButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
});
