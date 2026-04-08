import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { TabTransition } from '@/src/components/TabTransition';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import { Blink } from '@/src/components/Blink';
import { FRAMES, BANNERS, EXPRESSIONS, RARITY_COLORS, getDailyFeatured, type FrameCosmetic, type BannerCosmetic, type ExpressionCosmetic } from '@/src/data/cosmetics';
import StarterPackPopup from '@/src/components/StarterPackPopup';
import { InfoCard } from '@/src/components/InfoCard';
import { CosmeticCelebration } from '@/src/components/CosmeticCelebration';
import type { Cosmetic } from '@/src/data/cosmetics';
import { LIVES_CONFIG } from '@/src/utils/scoring';
import { ALL_POWERUPS, getPowerupsForMode, MODE_FILTERS, POWERUP_EMOJIS, type PowerUpDef } from '@/src/data/powerUps';

const GEM = '\u{1F48E}';

function ShopTab() {
  const { colors } = useTheme();
  const { gems, powerUps, buyPowerUp, refillLivesWithGems, addGems } = useGameStore();
  const [selectedMode, setSelectedMode] = useState('classic');
  const [cosmeticTab, setCosmeticTab] = useState<'featured' | 'frames' | 'banners' | 'expressions'>('featured');
  const [gemShortfall, setGemShortfall] = useState<{ cost: number; name: string } | null>(null);
  const [celebrationItem, setCelebrationItem] = useState<Cosmetic | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const dailyFeatured = getDailyFeatured(today);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const [starterPackAvailable, setStarterPackAvailable] = useState(false);
  const [starterPackTimeLeft, setStarterPackTimeLeft] = useState('');

  // Check if starter pack is within its 24hr window
  useEffect(() => {
    (async () => {
      try {
        const purchased = await AsyncStorage.getItem('starter_pack_purchased');
        if (purchased) return;
        const offeredAt = await AsyncStorage.getItem('starter_pack_offered_at');
        if (!offeredAt) return;
        const elapsed = Date.now() - parseInt(offeredAt, 10);
        const remaining = 24 * 60 * 60 * 1000 - elapsed;
        if (remaining <= 0) return;
        setStarterPackAvailable(true);
        // Update countdown every minute
        const update = () => {
          const left = 24 * 60 * 60 * 1000 - (Date.now() - parseInt(offeredAt, 10));
          if (left <= 0) { setStarterPackAvailable(false); return; }
          const h = Math.floor(left / 3600000);
          const m = Math.floor((left % 3600000) / 60000);
          setStarterPackTimeLeft(h > 0 ? `${h}h ${m}m left` : `${m}m left`);
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
      } catch {}
    })();
  }, []);

  const visiblePowerups = getPowerupsForMode(selectedMode);

  const handleSubscribe = (plan: 'monthly' | 'yearly', trial: boolean = false) => {
    // RevenueCat integration point — for now show confirmation
    Alert.alert(
      'Blanked+',
      `${plan === 'yearly' ? 'Yearly' : 'Monthly'} plan selected. In-app purchases will be available when RevenueCat is configured.`,
      [{ text: 'OK', onPress: () => setShowPaywall(false) }]
    );
  };


  const handleBuyPowerUp = (p: PowerUpDef, qty: number) => {
    const cost = qty >= 3 ? p.bundleCost : p.cost * qty;
    if (gems < cost) { setGemShortfall({ cost, name: 'this item' }); return; }
    buyPowerUp(p.id, qty, p.cost);
  };

  const handleIAP = () => { Alert.alert('Coming soon', 'In-app purchases will be available soon!'); };

  const handleGemRefillLives = () => {
    if (gems < LIVES_CONFIG.gemRefillCost) { setGemShortfall({ cost: LIVES_CONFIG.gemRefillCost, name: 'lives refill' }); return; }
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
        {/* ── Blanked+ Banner ── */}
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={() => setShowPaywall(true)}
        >
          <LinearGradient
            colors={['#6C5CE7', '#5B4CC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.plusBanner}
          >
            <View style={styles.plusBannerLeft}>
              <View style={styles.plusLogoBg}>
                <Blink expression="celebrate" size={28} />
              </View>
              <View>
                <Text style={styles.plusTitle}>Blanked<Text style={{ fontWeight: '900' }}>+</Text></Text>
                <Text style={styles.plusSubtitle}>Unlimited lives, no ads, 100 gems/mo</Text>
              </View>
            </View>
            <View style={styles.plusArrow}>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Starter Pack (24hr window only) ── */}
        {starterPackAvailable && (
          <Pressable
            style={({ pressed }) => [styles.starterBanner, { backgroundColor: colors.card }, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={() => setShowStarterPack(true)}
          >
            <View style={[styles.starterIconBg, { backgroundColor: '#FF6B6B12' }]}>
              <Ionicons name="gift" size={20} color="#FF6B6B" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.starterTitle, { color: colors.text }]}>Starter Pack</Text>
                <View style={[styles.starterBadge, { backgroundColor: colors.wrong }]}>
                  <Text style={styles.starterBadgeText}>75% OFF</Text>
                </View>
              </View>
              <Text style={[styles.starterTimer, { color: colors.wrong }]}>{starterPackTimeLeft}</Text>
            </View>
            <Text style={[styles.starterPrice, { color: colors.accent }]}>{'\u00A3'}0.99</Text>
          </Pressable>
        )}

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

        {/* ── Cosmetics ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cosmetics</Text>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
          {(['featured', 'frames', 'banners', 'expressions'] as const).map(tab => (
            <Pressable key={tab} onPress={() => setCosmeticTab(tab)} style={[styles.cosmeticTabPill, { backgroundColor: cosmeticTab === tab ? colors.accent : colors.card, borderColor: cosmeticTab === tab ? colors.accent : colors.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: cosmeticTab === tab ? '#FFF' : colors.textMid }}>
                {tab === 'featured' ? '✨ Today' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Featured tab */}
        {cosmeticTab === 'featured' && (
          <View>
            <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600', marginBottom: 10 }}>Refreshes daily · 20% off</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {dailyFeatured.map(({ cosmetic: c, originalPrice, discountedPrice }) => {
                const owned = useGameStore.getState().ownedCosmetics.includes(c.id);
                const isFrame = c.type === 'frame';
                const isExpr = c.type === 'expression';
                return (
                  <Pressable key={c.id} onPress={() => {
                    if (owned) return;
                    const ok = useGameStore.getState().purchaseCosmetic(c.id, discountedPrice);
                    if (ok) { useGameStore.getState().equipCosmetic(c.type as any, c.id); setCelebrationItem(c); }
                    else setGemShortfall({ cost: discountedPrice, name: c.name });
                  }} style={[styles.cosmeticCard, { backgroundColor: colors.card, borderColor: owned ? colors.correct : colors.border }]}>
                    {isFrame && <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: (c as any).borderColor ?? colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}><Blink expression="normal" size={30} /></View>}
                    {isExpr && <View style={{ marginBottom: 4 }}><Blink expression={(c as any).blinkExpression ?? 'normal'} size={40} /></View>}
                    {c.type === 'banner' && <LinearGradient colors={(c as any).gradientColors ?? [colors.accent, colors.accentLight]} style={{ width: 60, height: 24, borderRadius: 6, marginBottom: 4 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ fontSize: 8, color: RARITY_COLORS[c.rarity], fontWeight: '600' }}>{c.rarity.toUpperCase()}</Text>
                    {owned ? <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Text style={{ fontSize: 9, color: colors.textLight, textDecorationLine: 'line-through' }}>{originalPrice}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{discountedPrice}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Frames tab */}
        {cosmeticTab === 'frames' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {FRAMES.filter(f => f.id !== 'frame_none').map((f, fi) => {
              const owned = f.unlock === 'free' || useGameStore.getState().ownedCosmetics.includes(f.id);
              const exprs = ['normal', 'memorise', 'correct', 'streak', 'celebrate', 'love', 'thinking', 'surprised', 'sleeping', 'sad', 'wrong', 'blank'] as const;
              return (
                <Pressable key={f.id} onPress={() => {
                  if (owned) { useGameStore.getState().equipCosmetic('frame', f.id); }
                  else { setShowUnavailable(true); }
                }} style={[styles.cosmeticCard, { backgroundColor: colors.card, borderColor: owned ? f.borderColor : colors.border, opacity: owned ? 1 : 0.4 }]}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: f.borderColor, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Blink expression={exprs[fi % exprs.length]} size={30} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[f.rarity], fontWeight: '600' }}>{f.rarity.toUpperCase()}</Text>
                  {owned ? <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text>
                    : <Ionicons name="lock-closed" size={10} color={colors.textLight} style={{ marginTop: 3 }} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Banners tab */}
        {cosmeticTab === 'banners' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {BANNERS.filter(b => b.id !== 'banner_none').map(b => {
              const owned = b.unlock === 'free' || useGameStore.getState().ownedCosmetics.includes(b.id);
              return (
                <Pressable key={b.id} onPress={() => {
                  if (owned) { useGameStore.getState().equipCosmetic('banner', b.id); }
                  else { setShowUnavailable(true); }
                }} style={[styles.cosmeticCardWide, { backgroundColor: colors.card, borderColor: owned ? colors.correct : colors.border, opacity: owned ? 1 : 0.4 }]}>
                  <LinearGradient colors={b.gradientColors} style={{ width: '100%', height: 32, borderRadius: 8, marginBottom: 6 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[b.rarity], fontWeight: '600' }}>{b.rarity.toUpperCase()}</Text>
                  {owned ? <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text>
                    : <Ionicons name="lock-closed" size={10} color={colors.textLight} style={{ marginTop: 3 }} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Expressions tab */}
        {cosmeticTab === 'expressions' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {EXPRESSIONS.map(e => {
              const owned = e.unlock === 'free' || useGameStore.getState().ownedCosmetics.includes(e.id);
              return (
                <Pressable key={e.id} onPress={() => {
                  if (owned) { useGameStore.getState().equipCosmetic('expression', e.id); }
                  else { setShowUnavailable(true); }
                }} style={[styles.cosmeticCard, { backgroundColor: colors.card, borderColor: owned ? colors.accent : colors.border, opacity: owned ? 1 : 0.4 }]}>
                  <View style={{ marginBottom: 4 }}><Blink expression={e.blinkExpression} size={40} /></View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[e.rarity], fontWeight: '600' }}>{e.rarity.toUpperCase()}</Text>
                  {owned ? <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text>
                    : <Ionicons name="lock-closed" size={10} color={colors.textLight} style={{ marginTop: 3 }} />}
                </Pressable>
              );
            })}
          </View>
        )}

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

      {/* Blanked+ paywall */}
      <SubscriptionPaywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
      />
      <StarterPackPopup
        visible={showStarterPack}
        onDismiss={() => setShowStarterPack(false)}
        onPurchase={() => {
          setShowStarterPack(false);
          setStarterPackAvailable(false);
          Alert.alert('Starter Pack', 'In-app purchases will be available when RevenueCat is configured.');
        }}
      />
      {/* Item unavailable info card */}
      <InfoCard
        visible={showUnavailable}
        icon={<Ionicons name="time-outline" size={20} color="#6C5CE7" />}
        title="Not Available Yet"
        description="This item isn't in today's shop. Check back tomorrow \u2014 the featured items rotate daily with 20% off!"
        tip="Tap the \u2728 Today tab to see what's available right now"
        accentColor="#6C5CE7"
        onClose={() => setShowUnavailable(false)}
      />

      {/* Purchase celebration */}
      <CosmeticCelebration visible={!!celebrationItem} item={celebrationItem} onDismiss={() => setCelebrationItem(null)} />

      {/* Not enough gems info card */}
      <InfoCard
        visible={gemShortfall !== null}
        icon={<Ionicons name="diamond" size={20} color="#6C5CE7" style={{ opacity: 0.4 }} />}
        title="Not Enough Gems"
        description={gemShortfall ? `You need ${gemShortfall.cost - gems} more gems for "${gemShortfall.name}". Keep playing to earn gems \u2014 every level gives 1-3 gems based on your stars.` : ''}
        tip="Play levels to earn gems, or check gem packs below"
        accentColor="#6C5CE7"
        onClose={() => setGemShortfall(null)}
      />
    </SafeAreaView>
    </TabTransition>
  );
}

export default ShopTab;
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

  // Starter pack (conditional)
  starterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  starterIconBg: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  starterTitle: { fontSize: 14, fontWeight: '700' },
  starterBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  starterBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  starterTimer: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  starterPrice: { fontSize: 16, fontWeight: '800' },

  // Power-ups
  powerUpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  powerUpCardWrapper: { width: '48%', flexGrow: 1 },
  powerUpCard: { alignItems: 'center', padding: 16, borderRadius: 16, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
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
  gemPackCard: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 20, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  bestValueBadge: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 5, alignItems: 'center' },
  bestValueText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  packGemAmount: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  packBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20, marginTop: 4 },

  // Lives
  livesCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
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
  cosmeticTabPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
  cosmeticCard: { width: '30%' as any, flexGrow: 1, padding: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' as const },
  cosmeticCardWide: { width: '47%' as any, flexGrow: 1, padding: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' as const },
  removeAdsCard: { borderRadius: 20, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  removeAdsContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  removeAdsIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeAdsTitle: { fontSize: 16, fontWeight: '700' },
  removeAdsBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },

  // Blanked+ banner
  plusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, padding: 16, marginTop: 8, marginBottom: 8,
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6,
  },
  plusBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  plusLogoBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  plusTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  plusSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  plusArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
