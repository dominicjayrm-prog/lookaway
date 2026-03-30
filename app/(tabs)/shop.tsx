import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { POWER_UP_COSTS, LIVES_CONFIG, bundlePrice, type PowerUpId } from '@/src/utils/scoring';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

const POWER_UPS: { id: PowerUpId; icon: string; name: string; description: string; tint: string; tintMid: string; tintStrong: string }[] = [
  { id: 'slowTime', icon: '\u23F1', name: 'Slow Time', description: '+3s viewing time', tint: 'rgba(9,132,227,0.08)', tintMid: 'rgba(9,132,227,0.12)', tintStrong: '#0984E3' },
  { id: 'peek', icon: '\u{1F441}', name: 'Peek', description: 'Flash scene 1s', tint: 'rgba(108,92,231,0.08)', tintMid: 'rgba(108,92,231,0.12)', tintStrong: '#6C5CE7' },
  { id: 'fiftyFifty', icon: '\u2702\uFE0F', name: '50/50', description: 'Remove 2 options', tint: 'rgba(0,184,148,0.08)', tintMid: 'rgba(0,184,148,0.12)', tintStrong: '#00B894' },
  { id: 'skip', icon: '\u23ED', name: 'Skip', description: 'Skip a question', tint: 'rgba(255,107,107,0.08)', tintMid: 'rgba(255,107,107,0.12)', tintStrong: '#FF6B6B' },
];

const GEM_PACKS = [
  { id: 'gems_100', gems: 100, price: '\u00A30.99', badge: null },
  { id: 'gems_500', gems: 500, price: '\u00A33.99', badge: 'BEST VALUE' },
  { id: 'gems_1200', gems: 1200, price: '\u00A37.99', badge: null },
];

const gemIcon = '\u{1F48E}';

export default function ShopTab() {
  const { colors } = useTheme();
  const { gems, powerUps, buyPowerUp, refillLivesWithGems, refillLives } = useGameStore();

  const handleBuyPowerUp = (id: PowerUpId, qty: number) => {
    const cost = bundlePrice(POWER_UP_COSTS[id], qty);
    if (gems < cost) {
      Alert.alert('Not enough gems', `You need ${gemIcon} ${cost} gems.`);
      return;
    }
    buyPowerUp(id, qty);
  };

  const handleIAP = () => {
    Alert.alert('Coming soon', 'In-app purchases will be available soon!');
  };

  const handleGemRefillLives = () => {
    if (gems < LIVES_CONFIG.gemRefillCost) {
      Alert.alert('Not enough gems', `You need ${gemIcon} ${LIVES_CONFIG.gemRefillCost} gems.`);
      return;
    }
    refillLivesWithGems();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Shop</Text>
        <View style={[styles.gemDisplay, { backgroundColor: colors.accentSoft }]}>
          <Text style={styles.gemEmoji}>{gemIcon}</Text>
          <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Power-ups with owned count */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Power-ups</Text>
        <View style={styles.powerUpGrid}>
          {POWER_UPS.map((p) => {
            const owned = powerUps[p.id];
            const cost = POWER_UP_COSTS[p.id];
            const bundleCost = bundlePrice(cost, 3);
            return (
              <View key={p.id} style={styles.powerUpCardWrapper}>
                <Card style={{ ...styles.powerUpCard, backgroundColor: p.tint }}>
                  {owned > 0 && (
                    <View style={[styles.ownedBadge, { backgroundColor: p.tintStrong }]}>
                      <Text style={styles.ownedBadgeText}>{owned}</Text>
                    </View>
                  )}
                  <View style={[styles.powerUpIconCircle, { backgroundColor: p.tintMid }]}>
                    <Text style={styles.powerUpIcon}>{p.icon}</Text>
                  </View>
                  <Text style={[styles.powerUpName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={styles.powerUpDescription}>{p.description}</Text>
                  <Text style={styles.ownedText}>Owned: {owned}</Text>
                  <Button
                    title={`${gemIcon} ${cost}`}
                    variant="secondary"
                    onPress={() => handleBuyPowerUp(p.id, 1)}
                    style={styles.buyButton}
                    textStyle={{ fontSize: 12, fontWeight: '700', color: p.tintStrong }}
                  />
                  <Button
                    title={`3 for ${gemIcon} ${bundleCost}`}
                    variant="ghost"
                    onPress={() => handleBuyPowerUp(p.id, 3)}
                    style={styles.bundleButton}
                    textStyle={{ fontSize: 10, fontWeight: '600', color: colors.textMid }}
                  />
                </Card>
              </View>
            );
          })}
        </View>

        {/* Gem packs */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {GEM_PACKS.map((pack) => (
            <Card key={pack.id} style={{ ...styles.gemPackCard, paddingTop: pack.badge ? 36 : spacing.xl }}>
              {pack.badge && <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>{pack.badge}</Text></View>}
              <Text style={styles.packGemEmoji}>{gemIcon}</Text>
              <Text style={[styles.packGemAmount, { color: colors.text }]}>{pack.gems.toLocaleString()}</Text>
              <Text style={styles.packGemsLabel}>gems</Text>
              <Button title={pack.price} variant="secondary" onPress={handleIAP} style={styles.packButton} textStyle={styles.packButtonText} />
            </Card>
          ))}
        </View>

        {/* Lives — £0.99 first (most prominent), then unlimited, then gems (last) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lives</Text>
        <Card style={styles.livesCard}>
          {/* Cash refill — most prominent */}
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="heart" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.livesRowTextBold}>Refill all 5 lives</Text>
              </View>
            </View>
            <Button title={'\u00A30.99'} onPress={handleIAP} style={styles.cashLivesButton} textStyle={styles.cashLivesButtonText} />
          </View>

          <View style={styles.livesDivider} />

          {/* Unlimited hour */}
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="infinite" size={22} color={colors.gold} />
              </View>
              <Text style={styles.livesRowText}>Unlimited for 1 hour</Text>
            </View>
            <Button title={'\u00A31.99'} variant="secondary" onPress={handleIAP} style={styles.iapSmallButton} textStyle={styles.iapSmallButtonText} />
          </View>

          <View style={styles.livesDivider} />

          {/* Gem refill — de-emphasised, last */}
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="heart-outline" size={18} color={colors.textLight} />
              </View>
              <Text style={styles.livesRowTextFaded}>Refill all lives</Text>
            </View>
            <Button
              title={`${gemIcon} ${LIVES_CONFIG.gemRefillCost}`}
              variant="ghost"
              onPress={handleGemRefillLives}
              style={styles.gemLivesButton}
              textStyle={styles.gemLivesButtonText}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: typography.weights.heavy, letterSpacing: -0.3 },
  gemDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: borderRadius.pill },
  gemEmoji: { fontSize: 22 },
  gemCount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginTop: spacing.xl, marginBottom: spacing.md },

  // Power-ups
  powerUpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  powerUpCardWrapper: { width: '48%', flexGrow: 1 },
  powerUpCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg, position: 'relative' as const },
  ownedBadge: { position: 'absolute' as const, top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  ownedBadgeText: { fontSize: 11, fontWeight: '800' as const, color: '#FFFFFF' },
  powerUpIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center' as const, justifyContent: 'center' as const },
  powerUpIcon: { fontSize: 24 },
  powerUpName: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  powerUpDescription: { fontSize: typography.sizes.xs, color: colors.textMid, textAlign: 'center' as const },
  ownedText: { fontSize: 10, fontWeight: '600' as const, color: colors.textLight, marginTop: 2 },
  buyButton: { minHeight: 32, paddingVertical: 6, paddingHorizontal: spacing.md, marginTop: spacing.xs },
  bundleButton: { minHeight: 24, paddingVertical: 2, paddingHorizontal: spacing.sm },

  // Gem packs
  gemPackRow: { flexDirection: 'row' as const, gap: spacing.md },
  gemPackCard: { flex: 1, alignItems: 'center' as const, gap: spacing.sm, paddingBottom: spacing.xl, overflow: 'hidden' as const },
  bestValueBadge: { position: 'absolute' as const, top: 0, left: 0, right: 0, backgroundColor: colors.accent, paddingVertical: 5, alignItems: 'center' as const },
  bestValueText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.heavy, color: '#FFFFFF', letterSpacing: 1 },
  packGemEmoji: { fontSize: 32 },
  packGemAmount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy, color: colors.text },
  packGemsLabel: { fontSize: typography.sizes.sm, color: colors.textMid, fontWeight: typography.weights.medium, marginTop: -4 },
  packButton: { width: '90%', minHeight: 40, paddingVertical: spacing.sm, marginTop: spacing.xs },
  packButtonText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },

  // Lives
  livesCard: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' as const, marginBottom: spacing.xxxl },
  livesRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  livesRowLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md, flex: 1 },
  livesIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const },
  livesRowTextBold: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  livesRowText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  livesRowTextFaded: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.textLight },
  livesDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  cashLivesButton: { minHeight: 36, paddingVertical: 8, paddingHorizontal: spacing.lg, backgroundColor: colors.accent, borderRadius: borderRadius.md },
  cashLivesButtonText: { color: '#FFFFFF', fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  iapSmallButton: { minHeight: 32, paddingVertical: 6, paddingHorizontal: spacing.md },
  iapSmallButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  gemLivesButton: { minHeight: 28, paddingVertical: 4, paddingHorizontal: spacing.sm },
  gemLivesButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.textLight },
});
