import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { TabTransition } from '@/src/components/TabTransition';
import { POWER_UP_COSTS, LIVES_CONFIG, bundlePrice, type PowerUpId } from '@/src/utils/scoring';

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

const gemEmoji = '\u{1F48E}';

export default function ShopTab() {
  const { colors } = useTheme();
  const { gems, powerUps, buyPowerUp, refillLivesWithGems } = useGameStore();

  const handleBuyPowerUp = (id: PowerUpId, qty: number) => {
    const cost = bundlePrice(POWER_UP_COSTS[id], qty);
    if (gems < cost) { Alert.alert('Not enough gems', `You need ${gemEmoji} ${cost} gems.`); return; }
    buyPowerUp(id, qty);
  };

  const handleIAP = () => { Alert.alert('Coming soon', 'In-app purchases will be available soon!'); };

  const handleGemRefillLives = () => {
    if (gems < LIVES_CONFIG.gemRefillCost) { Alert.alert('Not enough gems', `You need ${gemEmoji} ${LIVES_CONFIG.gemRefillCost} gems.`); return; }
    refillLivesWithGems();
  };

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Shop</Text>
        <View style={[styles.gemDisplay, { backgroundColor: colors.accentSoft }]}>
          <Text style={styles.gemEmoji}>{gemEmoji}</Text>
          <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Power-ups */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Power-ups</Text>
        <View style={styles.powerUpGrid}>
          {POWER_UPS.map((p) => {
            const owned = powerUps[p.id];
            const cost = POWER_UP_COSTS[p.id];
            const bundleCost = bundlePrice(cost, 3);
            return (
              <View key={p.id} style={styles.powerUpCardWrapper}>
                <View style={[styles.powerUpCard, { backgroundColor: p.tint, borderRadius: 16 }]}>
                  {owned > 0 && (
                    <View style={[styles.ownedBadge, { backgroundColor: p.tintStrong }]}>
                      <Text style={styles.ownedBadgeText}>{owned}</Text>
                    </View>
                  )}
                  <View style={[styles.powerUpIconCircle, { backgroundColor: p.tintMid }]}>
                    <Text style={styles.powerUpIcon}>{p.icon}</Text>
                  </View>
                  <Text style={[styles.powerUpName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.powerUpDesc, { color: colors.textMid }]}>{p.description}</Text>
                  <Text style={[styles.ownedText, { color: colors.textLight }]}>Owned: {owned}</Text>
                  <TouchableOpacity onPress={() => handleBuyPowerUp(p.id, 1)} style={[styles.buyBtn, { borderColor: p.tintStrong }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: p.tintStrong }}>{gemEmoji} {cost}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleBuyPowerUp(p.id, 3)}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMid, marginTop: 4 }}>3 for {gemEmoji} {bundleCost}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Gem packs */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {GEM_PACKS.map((pack) => (
            <View key={pack.id} style={[styles.gemPackCard, { backgroundColor: colors.card }]}>
              {pack.badge && <View style={[styles.bestValueBadge, { backgroundColor: colors.accent }]}><Text style={styles.bestValueText}>{pack.badge}</Text></View>}
              <Text style={styles.packGemEmoji}>{gemEmoji}</Text>
              <Text style={[styles.packGemAmount, { color: colors.text }]}>{pack.gems.toLocaleString()}</Text>
              <Text style={[styles.packGemsLabel, { color: colors.textMid }]}>gems</Text>
              <TouchableOpacity onPress={handleIAP} style={[styles.packBtn, { borderColor: colors.accent }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{pack.price}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Lives */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lives</Text>
        <View style={[styles.livesCard, { backgroundColor: colors.card }]}>
          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="heart" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.livesText, { color: colors.text, fontWeight: '700' }]}>Refill all 5 lives</Text>
            </View>
            <TouchableOpacity onPress={handleIAP} style={[styles.cashBtn, { backgroundColor: colors.accent }]}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{'\u00A3'}0.99</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.livesDivider, { backgroundColor: colors.border }]} />

          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="infinite" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.livesText, { color: colors.text }]}>Unlimited for 1 hour</Text>
            </View>
            <TouchableOpacity onPress={handleIAP} style={[styles.outlineBtn, { borderColor: colors.accent }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{'\u00A3'}1.99</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.livesDivider, { backgroundColor: colors.border }]} />

          <View style={styles.livesRow}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="heart-outline" size={18} color={colors.textLight} />
              </View>
              <Text style={[styles.livesText, { color: colors.textLight }]}>Refill all lives</Text>
            </View>
            <TouchableOpacity onPress={handleGemRefillLives}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textLight }}>{gemEmoji} {LIVES_CONFIG.gemRefillCost}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  gemDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  gemEmoji: { fontSize: 22 },
  gemCount: { fontSize: 20, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 12 },

  powerUpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  powerUpCardWrapper: { width: '48%', flexGrow: 1 },
  powerUpCard: { alignItems: 'center', padding: 16, position: 'relative' },
  ownedBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  powerUpIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  powerUpIcon: { fontSize: 24 },
  powerUpName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  powerUpDesc: { fontSize: 10, textAlign: 'center', marginBottom: 4 },
  ownedText: { fontSize: 10, fontWeight: '600', marginBottom: 8 },
  buyBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },

  gemPackRow: { flexDirection: 'row', gap: 12 },
  gemPackCard: { flex: 1, borderRadius: 16, alignItems: 'center', paddingTop: 20, paddingBottom: 20, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  bestValueBadge: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 5, alignItems: 'center' },
  bestValueText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  packGemEmoji: { fontSize: 32, marginTop: 8 },
  packGemAmount: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  packGemsLabel: { fontSize: 12, fontWeight: '500', marginTop: -2, marginBottom: 12 },
  packBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },

  livesCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, marginBottom: 32 },
  livesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  livesRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  livesIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  livesText: { fontSize: 14, fontWeight: '600' },
  livesDivider: { height: 1, marginHorizontal: 16 },
  cashBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  outlineBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
});
