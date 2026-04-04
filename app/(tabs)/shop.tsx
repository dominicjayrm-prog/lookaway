import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { TabTransition } from '@/src/components/TabTransition';
import { LIVES_CONFIG } from '@/src/utils/scoring';
import { ALL_POWERUPS, getPowerupsForMode, MODE_FILTERS, POWERUP_EMOJIS, type PowerUpDef } from '@/src/data/powerUps';

const GEM = '\u{1F48E}';

export default function ShopTab() {
  const { colors } = useTheme();
  const { gems, powerUps, buyPowerUp, refillLivesWithGems } = useGameStore();
  const [selectedMode, setSelectedMode] = useState('classic');

  const visiblePowerups = getPowerupsForMode(selectedMode);

  const handleBuyPowerUp = (p: PowerUpDef, qty: number) => {
    const cost = qty >= 3 ? p.bundleCost : p.cost * qty;
    if (gems < cost) { Alert.alert('Not enough gems', `You need ${GEM} ${cost} gems.`); return; }
    buyPowerUp(p.id, qty, p.cost);
  };

  const handleIAP = () => { Alert.alert('Coming soon', 'In-app purchases will be available soon!'); };

  const handleGemRefillLives = () => {
    if (gems < LIVES_CONFIG.gemRefillCost) { Alert.alert('Not enough gems', `You need ${GEM} ${LIVES_CONFIG.gemRefillCost} gems.`); return; }
    refillLivesWithGems();
  };

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Sticky header */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Shop</Text>
        <View style={[styles.gemDisplay, { backgroundColor: colors.accentSoft }]}>
          <Text style={{ fontSize: 20 }}>{GEM}</Text>
          <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Power-ups ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Power-ups</Text>

        {/* Mode selector pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll} contentContainerStyle={styles.modeScrollContent}>
          {MODE_FILTERS.map(m => {
            const isActive = selectedMode === m.id;
            return (
              <Pressable
                key={m.id}
                style={[styles.modePill, { backgroundColor: isActive ? m.color : colors.card, borderWidth: isActive ? 0 : 1, borderColor: colors.border }]}
                onPress={() => setSelectedMode(m.id)}
              >
                <Text style={[styles.modePillText, { color: isActive ? '#FFF' : colors.textMid }]}>{m.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Power-up grid */}
        <View style={styles.powerUpGrid}>
          {visiblePowerups.map((p) => {
            const owned = (powerUps as Record<string, number>)[p.id] ?? 0;
            const emoji = POWERUP_EMOJIS[p.id] ?? '\u2728';
            const isUniversal = p.modes.includes('all');

            return (
              <View key={p.id} style={styles.powerUpCardWrapper}>
                <View style={[styles.powerUpCard, { backgroundColor: p.bgColor }]}>
                  {owned > 0 && (
                    <View style={[styles.ownedBadge, { backgroundColor: p.color }]}>
                      <Text style={styles.ownedBadgeText}>{owned}</Text>
                    </View>
                  )}
                  {isUniversal && (
                    <View style={[styles.universalBadge, { backgroundColor: colors.goldSoft }]}>
                      <Text style={[styles.universalBadgeText, { color: colors.gold }]}>ALL MODES</Text>
                    </View>
                  )}
                  <View style={[styles.powerUpIconCircle, { backgroundColor: `${p.color}18` }]}>
                    <Text style={styles.powerUpIcon}>{emoji}</Text>
                  </View>
                  <Text style={[styles.powerUpName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.powerUpDesc, { color: colors.textMid }]}>{p.description}</Text>
                  <View style={[styles.ownedPill, owned > 0 ? { backgroundColor: 'rgba(0,184,148,0.1)' } : { backgroundColor: 'transparent' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: owned > 0 ? '#00B894' : colors.textLight }}>Owned: {owned}</Text>
                  </View>
                  <Pressable onPress={() => handleBuyPowerUp(p, 1)} style={[styles.buyBtn, { borderColor: p.color }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: p.color }}>{GEM} {p.cost}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleBuyPowerUp(p, 3)}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMid, marginTop: 4 }}>3 for {GEM} {p.bundleCost}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Gem packs ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {[
            { id: 'gems_100', gems: 100, price: '\u00A30.99', badge: null },
            { id: 'gems_500', gems: 500, price: '\u00A33.99', badge: 'BEST VALUE' },
            { id: 'gems_1200', gems: 1200, price: '\u00A37.99', badge: null },
          ].map((pack) => (
            <Pressable key={pack.id} onPress={handleIAP} style={[styles.gemPackCard, { backgroundColor: colors.card }]}>
              {pack.badge && <View style={[styles.bestValueBadge, { backgroundColor: colors.accent }]}><Text style={styles.bestValueText}>{pack.badge}</Text></View>}
              <Text style={{ fontSize: 32, marginTop: pack.badge ? 16 : 0 }}>{GEM}</Text>
              <Text style={[styles.packGemAmount, { color: colors.text }]}>{pack.gems.toLocaleString()}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMid, marginBottom: 12 }}>gems</Text>
              <View style={[styles.packBtn, { borderColor: colors.accent }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{pack.price}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Lives ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lives</Text>
        <View style={[styles.livesCard, { backgroundColor: colors.card }]}>
          <Pressable style={styles.livesRow} onPress={handleIAP}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="heart" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.livesTextBold, { color: colors.text }]}>Refill all 5 lives</Text>
                <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 1 }}>The quickest way to keep playing</Text>
              </View>
            </View>
            <View style={[styles.cashBtn, { backgroundColor: colors.accent }]}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{'\u00A3'}0.99</Text>
            </View>
          </Pressable>
          <View style={[styles.livesDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.livesRow} onPress={handleIAP}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="infinite" size={22} color={colors.gold} />
              </View>
              <View>
                <Text style={[styles.livesText, { color: colors.text }]}>Unlimited for 1 hour</Text>
                <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 1 }}>Play as much as you want</Text>
              </View>
            </View>
            <View style={[styles.outlineBtn, { borderColor: colors.accent }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{'\u00A3'}1.99</Text>
            </View>
          </Pressable>
          <View style={[styles.livesDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.livesRow} onPress={handleGemRefillLives}>
            <View style={styles.livesRowLeft}>
              <View style={[styles.livesIconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="heart-outline" size={18} color={colors.textLight} />
              </View>
              <View>
                <Text style={[styles.livesTextFaded, { color: colors.textMid }]}>Refill with gems</Text>
                <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>Use your gem balance</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textLight }}>{GEM} {LIVES_CONFIG.gemRefillCost}</Text>
          </Pressable>
        </View>

        {/* ── Remove ads ── */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMid, marginTop: 8, marginBottom: 12 }}>Other</Text>
        <View style={[styles.removeAdsCard, { backgroundColor: colors.card }]}>
          <View style={styles.removeAdsContent}>
            <View style={[styles.removeAdsIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="eye-off-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.removeAdsTitle, { color: colors.text }]}>Remove ads</Text>
              <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 2, lineHeight: 18 }}>Remove all interstitial and banner ads forever</Text>
            </View>
          </View>
          <Pressable onPress={handleIAP} style={[styles.removeAdsBtn, { borderColor: colors.accent }]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{'\u00A3'}4.99 {'\u2014'} one time</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  gemDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  gemCount: { fontSize: 20, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },

  // Mode selector
  modeScroll: { marginBottom: 12, marginHorizontal: -16 },
  modeScrollContent: { paddingHorizontal: 16, gap: 6 },
  modePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modePillText: { fontSize: 13, fontWeight: '600' },

  // Power-ups
  powerUpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  powerUpCardWrapper: { width: '48%', flexGrow: 1 },
  powerUpCard: { alignItems: 'center', padding: 16, borderRadius: 16, position: 'relative' },
  ownedBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  universalBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  universalBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  powerUpIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  powerUpIcon: { fontSize: 24 },
  powerUpName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  powerUpDesc: { fontSize: 10, textAlign: 'center', marginBottom: 6 },
  ownedPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 8 },
  buyBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },

  // Gem packs
  gemPackRow: { flexDirection: 'row', gap: 12 },
  gemPackCard: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 20, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  bestValueBadge: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 5, alignItems: 'center' },
  bestValueText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  packGemAmount: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  packBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20, marginTop: 4 },

  // Lives
  livesCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  livesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  livesRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  livesIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  livesTextBold: { fontSize: 14, fontWeight: '700' },
  livesText: { fontSize: 14, fontWeight: '600' },
  livesTextFaded: { fontSize: 13, fontWeight: '500' },
  livesDivider: { height: 1, marginHorizontal: 16 },
  cashBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  outlineBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },

  // Remove ads
  removeAdsCard: { borderRadius: 20, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  removeAdsContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  removeAdsIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeAdsTitle: { fontSize: 16, fontWeight: '700' },
  removeAdsBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
