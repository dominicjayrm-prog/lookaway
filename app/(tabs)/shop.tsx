import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { TabTransition } from '@/src/components/TabTransition';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import { Blink } from '@/src/components/Blink';
import { FRAMES, BANNERS, EXPRESSIONS, RARITY_COLORS, getDailyFeatured, isWeekend, sortByRarity, type FrameCosmetic, type BannerCosmetic, type ExpressionCosmetic } from '@/src/data/cosmetics';
import { showRewardedAd, getRemainingAdWatches } from '@/src/utils/adService';
import StarterPackPopup from '@/src/components/StarterPackPopup';
import { InfoCard } from '@/src/components/InfoCard';
import { CosmeticCelebration } from '@/src/components/CosmeticCelebration';
import { PremiumCelebration } from '@/src/components/PremiumCelebration';
import type { Cosmetic } from '@/src/data/cosmetics';
import { LIVES_CONFIG } from '@/src/utils/scoring';
import { AnimatedGemCount } from '@/src/components/AnimatedGemCount';
import { ALL_POWERUPS, getPowerupsForMode, MODE_FILTERS, POWERUP_EMOJIS, type PowerUpDef } from '@/src/data/powerUps';
import { IAP_PRODUCT_IDS } from '@/src/data/iapProducts';
import { purchaseProduct, purchaseSubscription, gemsForProduct, type PurchaseResult } from '@/src/lib/purchases';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import { log } from '@/src/lib/logger';
import { sounds } from '@/src/lib/sounds';

const GEM = '\u{1F48E}';

/**
 * Small "FREE AD" badge overlaid on the top-right of a common,
 * ad-eligible cosmetic card. Hidden once the item is owned.
 */
function AdBadge({ colors }: { colors: Record<string, string> }) {
  return (
    <View style={[styles.adBadge, { backgroundColor: colors.correct }]}>
      <Ionicons name="play" size={8} color="#FFFFFF" />
      <Text style={styles.adBadgeText}>FREE AD</Text>
    </View>
  );
}

/**
 * Status line rendered at the bottom of every cosmetic card. Shows:
 *  - "OWNED" when the player already has the item
 *  - A spinner when a rewarded ad is currently loading for this card
 *  - "▶ Watch ad" for ad-eligible commons
 *  - Gem cost for anything else
 *  - A lock icon for achievement / subscriber-only items
 */
function CosmeticStatus({
  item,
  owned,
  isLoading,
  colors,
}: {
  item: { gemCost?: number; adEligible?: boolean; unlock: string };
  owned: boolean;
  isLoading: boolean;
  colors: Record<string, string>;
}) {
  if (owned) {
    return <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text>;
  }
  if (isLoading) {
    return <Text style={{ fontSize: 9, color: colors.accent, fontWeight: '700', marginTop: 3 }}>LOADING…</Text>;
  }
  if (item.adEligible) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
        <Ionicons name="play" size={9} color={colors.correct} />
        <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '800' }}>Watch ad</Text>
      </View>
    );
  }
  if (item.unlock === 'gems' && item.gemCost) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 }}>
        <Text style={{ fontSize: 10 }}>{GEM}</Text>
        <Text style={{ fontSize: 9, color: colors.accent, fontWeight: '800' }}>{item.gemCost}</Text>
      </View>
    );
  }
  return <Ionicons name="lock-closed" size={10} color={colors.textLight} style={{ marginTop: 3 }} />;
}

function ShopTab() {
  const { colors } = useTheme();
  // Shop can be navigated to with a "need X more gems" hint from the
  // streak recovery modal. We snapshot the params on first mount and
  // CLEAR them from the URL so they don't re-trigger after the player
  // recovers and visits the shop again later.
  const params = useLocalSearchParams<{ needGems?: string; reason?: string }>();
  const router = useRouter();
  const [bannerSnapshot] = useState(() => {
    const need = params.needGems ? parseInt(params.needGems, 10) : 0;
    if (need > 0 && params.reason === 'streak_recovery') {
      return `You need ${need} more gem${need !== 1 ? 's' : ''} to save your streak`;
    }
    return null;
  });
  useEffect(() => {
    if (bannerSnapshot) {
      // One-shot: clear params so a future tab visit doesn't re-show
      router.setParams({ needGems: undefined, reason: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bannerMessage = bannerSnapshot;
  // NOTE: destructuring `ownedCosmetics` here is load-bearing — without
  // it, the three cosmetic tabs read via `useGameStore.getState()` which
  // doesn't subscribe the component to changes, so buying an item (or
  // ad-unlocking a common) wouldn't flip the card to OWNED until some
  // other state change forced a re-render.
  const { gems, powerUps, buyPowerUp, refillLivesWithGems, addGems, ownedCosmetics } = useGameStore();
  const [selectedMode, setSelectedMode] = useState('classic');
  const [cosmeticTab, setCosmeticTab] = useState<'featured' | 'frames' | 'banners' | 'expressions'>('featured');
  const [gemShortfall, setGemShortfall] = useState<{ cost: number; name: string } | null>(null);
  const [celebrationItem, setCelebrationItem] = useState<Cosmetic | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [earnOnlyInfo, setEarnOnlyInfo] = useState<{ name: string; description: string } | null>(null);
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const dailyFeatured = getDailyFeatured(today);
  const dailyOnSale = isWeekend(today);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const [starterPackAvailable, setStarterPackAvailable] = useState(false);
  const [starterPackTimeLeft, setStarterPackTimeLeft] = useState('');
  const [adWatchesLeft, setAdWatchesLeft] = useState<number | null>(null);
  const [adLoadingId, setAdLoadingId] = useState<string | null>(null);
  // Refresh the remaining ad count on mount so the "X left today"
  // hint stays in sync with AsyncStorage across cold starts.
  useEffect(() => {
    getRemainingAdWatches().then(setAdWatchesLeft).catch(() => setAdWatchesLeft(5));
  }, []);

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

  const handleSubscribe = async (plan: 'monthly' | 'yearly', trial: boolean = false) => {
    setShowPaywall(false);
    const { result, isActive } = await purchaseSubscription(plan);
    if (result === 'cancelled') return;
    if (result === 'error') {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      return;
    }
    // Purchase succeeded — activate locally + sync to Supabase.
    const store = useGameStore.getState();
    store.activatePlus();
    store.unlockCosmetic('frame_premium_gold');
    store.unlockCosmetic('expr_premium');
    store.unlockCosmetic('banner_premium_gold');
    if (!trial) store.addGems(300);
    setShowPremiumCelebration(true);
  };


  const handleBuyPowerUp = (p: PowerUpDef, qty: number) => {
    const cost = qty >= 3 ? p.bundleCost : p.cost * qty;
    if (gems < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setGemShortfall({ cost, name: 'this item' });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    buyPowerUp(p.id, qty, p.cost);
  };

  /**
   * Shared tap handler for cosmetic cards across the Frames / Banners /
   * Expressions tabs. Routes the tap through three possible flows:
   *
   *   1. Already owned → equip it
   *   2. Ad-eligible (common) + ads remaining → show "Watch ad?" Alert
   *      and, on confirm, play the rewarded ad, unlock on success
   *   3. Otherwise → show the "not available yet" info card
   *
   * Blanked+ subscribers bypass the rewarded ad flow entirely and get
   * the item with a single tap (handled inside `showRewardedAd`,
   * which returns `granted: true, bypass: 'subscriber'`).
   */
  const handleCosmeticTap = useCallback(async (
    item: FrameCosmetic | BannerCosmetic | ExpressionCosmetic,
    slot: 'frame' | 'banner' | 'expression',
  ) => {
    const store = useGameStore.getState();
    const owned = store.ownedCosmetics.includes(item.id) || item.unlock === 'free';
    if (owned) {
      store.equipCosmetic(slot, item.id);
      return;
    }

    // Locked + ad-eligible → offer the rewarded ad path.
    if (item.adEligible) {
      const remaining = await getRemainingAdWatches();
      if (remaining === 0 && !store.isSubscribed()) {
        Alert.alert('Daily ad limit reached', 'Come back tomorrow for more free unlocks.');
        return;
      }
      Alert.alert(
        store.isSubscribed() ? `Unlock ${item.name}?` : `Watch a 30s ad to unlock ${item.name}?`,
        store.isSubscribed()
          ? 'Blanked+ members skip the ad and claim commons for free.'
          : `You\u2019ll get it for free. ${remaining} ad unlock${remaining === 1 ? '' : 's'} left today.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: store.isSubscribed() ? 'Claim free' : 'Watch ad',
            onPress: async () => {
              setAdLoadingId(item.id);
              const result = await showRewardedAd();
              setAdLoadingId(null);
              if (result.granted) {
                // Unlock and auto-equip — matches the purchaseCosmetic
                // flow which shows the celebration card next.
                store.unlockCosmetic(item.id);
                store.equipCosmetic(slot, item.id);
                setCelebrationItem(item as Cosmetic);
                getRemainingAdWatches().then(setAdWatchesLeft);
              } else if (result.reason === 'limit_reached') {
                Alert.alert('Daily ad limit reached', 'Come back tomorrow for more free unlocks.');
              } else {
                Alert.alert('Ad unavailable', 'Couldn\u2019t load an ad right now. Try again in a moment.');
              }
            },
          },
        ],
      );
      return;
    }

    // Locked + earn-only → show specific earn description
    if (item.unlock === 'earn' && item.earnDescription) {
      setEarnOnlyInfo({ name: item.name, description: item.earnDescription });
      return;
    }

    // Locked + not ad-eligible → existing fallback
    setShowUnavailable(true);
  }, []);

  /**
   * Real IAP handler. Routes through RevenueCat's purchaseProduct for
   * consumables / non-consumables. Each product type triggers a
   * different post-purchase reward in the game store.
   */
  const handleIAP = async (productId: string) => {
    const result = await purchaseProduct(productId);
    if (result === 'cancelled') return;
    if (result === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      return;
    }

    // Premium IAP success — heavy impact feels earned
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // ── Grant the reward based on which product was purchased ──
    const store = useGameStore.getState();
    const uid = store._authUserId;
    const gemReward = gemsForProduct(productId);
    if (gemReward > 0) {
      // Gem pack
      store.addGems(gemReward);
      if (uid) logEconomyEvent(uid, ECONOMY_EVENTS.IAP_GEMS, gemReward, { productId });
      sounds.play('gemClink');
      Alert.alert('Gems added!', `${gemReward} gems have been added to your balance.`);
    } else if (productId === IAP_PRODUCT_IDS.LIVES_REFILL) {
      store.refillLives();
      Alert.alert('Lives refilled!', 'All 5 lives are back.');
    } else if (productId === IAP_PRODUCT_IDS.LIVES_UNLIMITED_1H) {
      store.activateUnlimitedLives();
      Alert.alert('Unlimited lives!', 'Play as much as you want for the next hour.');
    } else if (productId === IAP_PRODUCT_IDS.STARTER_PACK) {
      store.addGems(200);
      store.buyPowerUp('slowTime', 3, 0);
      store.buyPowerUp('peek', 3, 0);
      store.buyPowerUp('fiftyFifty', 3, 0);
      store.refillLives();
      try { await AsyncStorage.setItem('starter_pack_purchased', 'true'); } catch {}
      setShowStarterPack(false);
      Alert.alert('Starter Pack unlocked!', '200 gems, 3 boosts, and unlimited play for 1 hour.');
    } else if (productId === IAP_PRODUCT_IDS.REMOVE_ADS) {
      store.setAdsRemoved();
      Alert.alert('Ads removed!', 'No more interstitial or banner ads. Enjoy!');
    }
    log.breadcrumb('purchases', 'reward granted', { productId });
  };

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
          <AnimatedGemCount count={gems} style={[styles.gemCount, { color: colors.accent }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Streak-recovery hint banner — set when the player tapped the
            gem option in the recovery modal but didn't have enough. */}
        {bannerMessage && (
          <View style={[styles.recoveryBanner, { backgroundColor: colors.wrongSoft, borderColor: colors.wrong + '40' }]}>
            <Text style={{ fontSize: 16 }}>{'\u{1F525}'}</Text>
            <Text style={[styles.recoveryBannerText, { color: colors.wrong }]} numberOfLines={2}>
              {bannerMessage}
            </Text>
          </View>
        )}
        {/* ── Blanked+ Banner ── */}
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={() => setShowPaywall(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Blanked Plus subscription"
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
                <Text style={styles.plusSubtitle}>Unlimited lives, no ads, 300 gems/mo</Text>
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
            accessibilityRole="button"
            accessibilityLabel="Open Starter Pack offer, 75 percent off"
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

        {/* ── Cosmetics ── (leads the shop — most visually rich) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cosmetics</Text>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
          {(['featured', 'frames', 'banners', 'expressions'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => { setCosmeticTab(tab); setCelebrationItem(null); }}
              style={[styles.cosmeticTabPill, { backgroundColor: cosmeticTab === tab ? colors.accent : colors.card, borderColor: cosmeticTab === tab ? colors.accent : colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={`${tab} tab`}
              accessibilityState={{ selected: cosmeticTab === tab }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: cosmeticTab === tab ? '#FFF' : colors.textMid }}>
                {tab === 'featured' ? '✨ Today' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Featured tab */}
        {cosmeticTab === 'featured' && (
          <View>
            <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600', marginBottom: 10 }}>
              {dailyOnSale ? 'Weekend sale \u00B7 20% off' : 'Refreshes daily \u00B7 Weekend sale Sat & Sun'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {dailyFeatured.map(({ cosmetic: c, originalPrice, discountedPrice }) => {
                const owned = ownedCosmetics.includes(c.id);
                const isFrame = c.type === 'frame';
                const isExpr = c.type === 'expression';
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      if (owned) return;
                      const ok = useGameStore.getState().purchaseCosmetic(c.id, discountedPrice);
                      if (ok) { setCelebrationItem(c); }
                      else setGemShortfall({ cost: discountedPrice, name: c.name });
                    }}
                    style={[styles.cosmeticCard, { backgroundColor: colors.card, borderColor: owned ? colors.correct : colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={owned ? `${c.name}, owned` : `Buy ${c.name} for ${discountedPrice} gems`}
                    accessibilityState={{ disabled: owned }}
                  >
                    {isFrame && <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'borderColor' in c ? (c as FrameCosmetic).borderColor : colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}><Blink expression="normal" size={30} /></View>}
                    {isExpr && <View style={{ marginBottom: 4 }}><Blink expression={'blinkExpression' in c ? (c as ExpressionCosmetic).blinkExpression : 'normal'} size={40} /></View>}
                    {c.type === 'banner' && <LinearGradient colors={('gradientColors' in c ? (c as BannerCosmetic).gradientColors : [colors.accent, '#A29BFE']) as unknown as readonly [string, string, ...string[]]} style={{ width: 60, height: 24, borderRadius: 6, marginBottom: 4 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ fontSize: 8, color: RARITY_COLORS[c.rarity], fontWeight: '600' }}>{c.rarity.toUpperCase()}</Text>
                    {owned ? <Text style={{ fontSize: 9, color: colors.correct, fontWeight: '700', marginTop: 3 }}>OWNED</Text> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        {dailyOnSale && <Text style={{ fontSize: 9, color: colors.textLight, textDecorationLine: 'line-through' }}>{originalPrice}</Text>}
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
            {sortByRarity(FRAMES.filter(f => f.id !== 'frame_none')).map((f, fi) => {
              const owned = f.unlock === 'free' || ownedCosmetics.includes(f.id);
              const exprs = ['normal', 'memorise', 'correct', 'streak', 'celebrate', 'love', 'thinking', 'surprised', 'sleeping', 'sad', 'wrong', 'blank'] as const;
              const isLegendary = f.rarity === 'legendary';
              const isLoading = adLoadingId === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => handleCosmeticTap(f, 'frame')}
                  style={[
                    styles.cosmeticCard,
                    { backgroundColor: colors.card, borderColor: owned ? f.borderColor : colors.border, opacity: owned ? 1 : 0.45 },
                    isLegendary && styles.legendaryCard,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? `${f.name} frame, owned` : `Unlock ${f.name} frame`}
                >
                  {!owned && f.adEligible && <AdBadge colors={colors} />}
                  <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: f.borderColor, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Blink expression={exprs[fi % exprs.length]} size={30} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[f.rarity], fontWeight: '600' }}>{f.rarity.toUpperCase()}</Text>
                  <CosmeticStatus item={f} owned={owned} isLoading={isLoading} colors={colors} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Banners tab */}
        {cosmeticTab === 'banners' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {sortByRarity(BANNERS.filter(b => b.id !== 'banner_none')).map(b => {
              const owned = b.unlock === 'free' || ownedCosmetics.includes(b.id);
              const isLegendary = b.rarity === 'legendary';
              const isLoading = adLoadingId === b.id;
              const vert = b.gradientDirection === 'vert';
              return (
                <Pressable
                  key={b.id}
                  onPress={() => handleCosmeticTap(b, 'banner')}
                  style={[
                    styles.cosmeticCardWide,
                    { backgroundColor: colors.card, borderColor: owned ? colors.correct : colors.border, opacity: owned ? 1 : 0.45 },
                    isLegendary && styles.legendaryCard,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? `${b.name} banner, owned` : `Unlock ${b.name} banner`}
                >
                  {!owned && b.adEligible && <AdBadge colors={colors} />}
                  <LinearGradient
                    colors={b.gradientColors as unknown as readonly [string, string, ...string[]]}
                    style={{ width: '100%', height: 32, borderRadius: 8, marginBottom: 6 }}
                    start={{ x: 0, y: 0 }}
                    end={vert ? { x: 0, y: 1 } : { x: 1, y: 1 }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[b.rarity], fontWeight: '600' }}>{b.rarity.toUpperCase()}</Text>
                  <CosmeticStatus item={b} owned={owned} isLoading={isLoading} colors={colors} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Expressions tab */}
        {cosmeticTab === 'expressions' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {sortByRarity(EXPRESSIONS).map(e => {
              const owned = e.unlock === 'free' || ownedCosmetics.includes(e.id);
              const isLegendary = e.rarity === 'legendary';
              const isLoading = adLoadingId === e.id;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => handleCosmeticTap(e, 'expression')}
                  style={[
                    styles.cosmeticCard,
                    { backgroundColor: colors.card, borderColor: owned ? colors.accent : colors.border, opacity: owned ? 1 : 0.45 },
                    isLegendary && styles.legendaryCard,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? `${e.name} expression, owned` : `Unlock ${e.name} expression`}
                >
                  {!owned && e.adEligible && <AdBadge colors={colors} />}
                  <View style={{ marginBottom: 4 }}><Blink expression={e.blinkExpression} size={40} /></View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ fontSize: 8, color: RARITY_COLORS[e.rarity], fontWeight: '600' }}>{e.rarity.toUpperCase()}</Text>
                  <CosmeticStatus item={e} owned={owned} isLoading={isLoading} colors={colors} />
                </Pressable>
              );
            })}
          </View>
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
                accessibilityRole="button"
                accessibilityLabel={`${m.name} mode filter`}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.modePillText, { color: isActive ? '#FFF' : colors.textMid }]}>{m.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Power-up grid — premium card redesign:
             - LinearGradient background using the power-up's colour
             - Solid colour icon disc (not a washed-out tint)
             - Solid colour buy button (high contrast, feels clickable)
             - Coloured shadow + border for depth */}
        <View style={styles.powerUpGrid}>
          {visiblePowerups.map((p) => {
            const owned = powerUps[p.id as keyof typeof powerUps] ?? 0;
            const emoji = POWERUP_EMOJIS[p.id] ?? '\u2728';
            const isUniversal = p.modes.includes('all');

            return (
              <View key={p.id} style={styles.powerUpCardWrapper}>
                <LinearGradient
                  colors={[`${p.color}22`, `${p.color}0A`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.powerUpCard,
                    {
                      borderColor: `${p.color}33`,
                      shadowColor: p.color,
                      shadowOpacity: 0.18,
                    },
                  ]}
                >
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
                  <View
                    style={[
                      styles.powerUpIconCircle,
                      {
                        backgroundColor: p.color,
                        shadowColor: p.color,
                        shadowOpacity: 0.4,
                        shadowOffset: { width: 0, height: 4 },
                        shadowRadius: 10,
                        elevation: 4,
                      },
                    ]}
                  >
                    <Text style={styles.powerUpIcon}>{emoji}</Text>
                  </View>
                  <Text style={[styles.powerUpName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.powerUpDesc, { color: colors.textMid }]}>{p.description}</Text>
                  <Pressable
                    onPress={() => handleBuyPowerUp(p, 1)}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      {
                        backgroundColor: p.color,
                        borderColor: p.color,
                        opacity: pressed ? 0.88 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Buy 1 ${p.name} for ${p.cost} gems`}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{GEM} {p.cost}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleBuyPowerUp(p, 3)}
                    accessibilityRole="button"
                    accessibilityLabel={`Buy 3 ${p.name} for ${p.bundleCost} gems`}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: p.color, marginTop: 6 }}>
                      3 for {GEM} {p.bundleCost}
                    </Text>
                  </Pressable>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* ── Lives ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lives</Text>
        <View style={[styles.livesCard, { backgroundColor: colors.card }]}>
          <Pressable
            style={styles.livesRow}
            onPress={() => handleIAP(IAP_PRODUCT_IDS.LIVES_REFILL)}
            accessibilityRole="button"
            accessibilityLabel="Refill all 5 lives for 99 pence"
          >
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
          <Pressable
            style={styles.livesRow}
            onPress={() => handleIAP(IAP_PRODUCT_IDS.LIVES_UNLIMITED_1H)}
            accessibilityRole="button"
            accessibilityLabel="Unlimited lives for 1 hour, 1 pound 99"
          >
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
          <Pressable
            style={styles.livesRow}
            onPress={handleGemRefillLives}
            accessibilityRole="button"
            accessibilityLabel={`Refill lives with ${LIVES_CONFIG.gemRefillCost} gems`}
          >
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

        {/* ── Gem packs ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gem packs</Text>
        <View style={styles.gemPackRow}>
          {[
            { id: IAP_PRODUCT_IDS.GEMS_100, gems: 100, price: '\u00A30.99', badge: null },
            { id: IAP_PRODUCT_IDS.GEMS_500, gems: 500, price: '\u00A33.99', badge: 'BEST VALUE' },
            { id: IAP_PRODUCT_IDS.GEMS_1200, gems: 1200, price: '\u00A37.99', badge: null },
          ].map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => handleIAP(pack.id)}
              style={[styles.gemPackCard, { backgroundColor: colors.card }]}
              accessibilityRole="button"
              accessibilityLabel={`Buy ${pack.gems} gems for ${pack.price}`}
            >
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

        {/* ── Remove ads ── */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMid, marginTop: 8, marginBottom: 12 }}>Other</Text>
        <View style={[styles.removeAdsCard, { backgroundColor: colors.card }]}>
          <View style={styles.removeAdsContent}>
            <View style={[styles.removeAdsIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="eye-off-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.removeAdsTitle, { color: colors.text }]}>Remove ads</Text>
              <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 2, lineHeight: 18 }}>Remove all ads from the app forever</Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleIAP(IAP_PRODUCT_IDS.REMOVE_ADS)}
            style={[styles.removeAdsBtn, { borderColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Buy remove ads for 4 pounds 99, one time"
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{'\u00A3'}4.99 - one time</Text>
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
        onPurchase={() => handleIAP(IAP_PRODUCT_IDS.STARTER_PACK)}
      />
      {/* Item unavailable info card */}
      <InfoCard
        visible={showUnavailable}
        icon={<Ionicons name="time-outline" size={20} color="#6C5CE7" />}
        title="Not Available Yet"
        description="This item isn't in today's shop. Check back tomorrow - the featured items rotate daily with 20% off!"
        tip="Tap the ✨ Today tab to see what's available right now"
        accentColor="#6C5CE7"
        onClose={() => setShowUnavailable(false)}
      />
      <InfoCard
        visible={!!earnOnlyInfo}
        icon={<Ionicons name="gift-outline" size={20} color="#D4A012" />}
        title={earnOnlyInfo?.name ?? 'Milestone Reward'}
        description={`This cosmetic can only be unlocked by completing: ${earnOnlyInfo?.description ?? 'a gameplay milestone'}`}
        tip="Head to the Journey tab and keep playing to earn it!"
        accentColor="#D4A012"
        onClose={() => setEarnOnlyInfo(null)}
      />

      {/* Premium celebration */}
      <PremiumCelebration visible={showPremiumCelebration} onDismiss={() => setShowPremiumCelebration(false)} />

      {/* Purchase celebration */}
      <CosmeticCelebration visible={!!celebrationItem} item={celebrationItem} onDismiss={() => setCelebrationItem(null)} />

      {/* Not enough gems info card */}
      <InfoCard
        visible={gemShortfall !== null}
        icon={<Ionicons name="diamond" size={20} color="#6C5CE7" style={{ opacity: 0.4 }} />}
        title="Not Enough Gems"
        description={gemShortfall ? `You need ${gemShortfall.cost - gems} more gems for "${gemShortfall.name}". Keep playing to earn gems, every level gives 1-3 gems based on your stars.` : ''}
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
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  recoveryBannerText: { fontSize: 12, fontWeight: '700', flex: 1 },
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
  powerUpCard: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  ownedBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  universalBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  universalBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  powerUpIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  powerUpIcon: { fontSize: 26 },
  powerUpName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  powerUpDesc: { fontSize: 10, textAlign: 'center', marginBottom: 10, lineHeight: 14, minHeight: 28 },
  ownedPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 8 },
  buyBtn: {
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },

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
  cosmeticCard: { width: '30%' as any, flexGrow: 1, padding: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' as const, position: 'relative' as const },
  legendaryCard: {
    borderColor: '#D4A012',
    backgroundColor: 'rgba(212,160,18,0.06)',
    shadowColor: '#D4A012',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  adBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  adBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
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
