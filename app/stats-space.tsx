/**
 * Memory Analytics (Stats Space) — a Blanked+ premium screen that visualises
 * the player's memory performance as a brain scan: Blink floating in an
 * ethereal space with drifting shapes, a weighted memory score, six stat
 * cards and a radar chart of their brain profile.
 *
 * Subscribers see their real data. Free users see a fake sample with a
 * frosted conversion overlay.
 *
 * Theme: reads the app's current light/dark setting. Every colour on this
 * screen comes from the active theme object — no hardcoded hex values.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions,
  Animated as RNAnimated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { purchaseSubscription } from '@/src/lib/purchases';
import { Blink } from '@/src/components/Blink';
import type { BlinkExpression } from '@/src/components/Blink';
import { getExpressionById } from '@/src/data/cosmetics';
import { FloatingShapes } from '@/src/components/stats/FloatingShapes';
import { BrainRadarChart } from '@/src/components/stats/BrainRadarChart';
import { StatsCard } from '@/src/components/stats/StatsCard';
import {
  computeMemoryScore,
  computeStatCards,
  computeBrainProfile,
  estimatePercentile,
  generateInsight,
  SAMPLE_ANALYTICS,
} from '@/src/utils/memoryAnalytics';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';

// ── Theme objects ─────────────────────────────────────────────────────

const ACCENT = '#6C5CE7';

interface StatsTheme {
  bg: string;
  glow: string;
  shapeOpacity: number;
  cardBg: string;
  cardBorder: string;
  title: string;
  subtitle: string;
  muted: string;
  insightBg: string;
  insightBorder: string;
  insightText: string;
  insightSub: string;
  radarGrid: string;
  radarAxis: string;
  radarFill: string;
  radarLabel: string;
  badgeBg: string;
  badgeText: string;
  backBg: string;
  backColor: string;
  blinkGlow: string;
  blinkShadow: string;
  scoreSub: string;
  blurOverlay: string;
}

const lightTheme: StatsTheme = {
  bg: '#FAFAF7',
  glow: 'rgba(108,92,231,0.06)',
  shapeOpacity: 0.06,
  cardBg: 'rgba(108,92,231,0.04)',
  cardBorder: 'rgba(108,92,231,0.06)',
  title: '#1A1A18',
  subtitle: '#636E72',
  muted: '#B2BEC3',
  insightBg: 'rgba(108,92,231,0.04)',
  insightBorder: 'rgba(108,92,231,0.06)',
  insightText: '#1A1A18',
  insightSub: '#636E72',
  radarGrid: 'rgba(108,92,231,0.08)',
  radarAxis: 'rgba(108,92,231,0.06)',
  radarFill: 'rgba(108,92,231,0.06)',
  radarLabel: '#636E72',
  badgeBg: 'rgba(108,92,231,0.1)',
  badgeText: '#6C5CE7',
  backBg: 'rgba(0,0,0,0.04)',
  backColor: '#B2BEC3',
  blinkGlow: 'rgba(108,92,231,0.1)',
  blinkShadow: 'rgba(108,92,231,0.06)',
  scoreSub: '#6C5CE7',
  blurOverlay: 'rgba(250,250,247,0.95)',
};

const darkTheme: StatsTheme = {
  bg: '#0C0B14',
  glow: 'rgba(108,92,231,0.08)',
  shapeOpacity: 0.08,
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.06)',
  title: '#FFFFFF',
  subtitle: 'rgba(255,255,255,0.5)',
  muted: 'rgba(255,255,255,0.3)',
  insightBg: 'rgba(255,255,255,0.04)',
  insightBorder: 'rgba(255,255,255,0.06)',
  insightText: '#FFFFFF',
  insightSub: 'rgba(255,255,255,0.4)',
  radarGrid: 'rgba(108,92,231,0.08)',
  radarAxis: 'rgba(108,92,231,0.06)',
  radarFill: 'rgba(108,92,231,0.08)',
  radarLabel: 'rgba(255,255,255,0.45)',
  badgeBg: 'rgba(108,92,231,0.15)',
  badgeText: '#A29BFE',
  backBg: 'rgba(255,255,255,0.08)',
  backColor: 'rgba(255,255,255,0.5)',
  blinkGlow: 'rgba(108,92,231,0.15)',
  blinkShadow: 'rgba(108,92,231,0.08)',
  scoreSub: '#A29BFE',
  blurOverlay: 'rgba(12,11,20,0.95)',
};

// ── Memory Score count-up ─────────────────────────────────────────────

function useCountUp(target: number, duration = 1500, delay = 0, animate = true): number {
  const [value, setValue] = useState(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [target, duration, delay, animate]);

  return value;
}

// ── Wandering-eye Blink ───────────────────────────────────────────────
// Blink's pupils drift to a new random position every 2-3 seconds, and he
// blinks (eyes closed → open) every 3-6 seconds. Both behaviours run on JS
// timers updating local state, which is cheap for a single instance.

function FloatingBlink({ expression, size }: { expression: BlinkExpression; size: number }) {
  const [lookX, setLookX] = useState(0);
  const [lookY, setLookY] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const floatY = useRef(new RNAnimated.Value(0)).current;

  // Eye wandering and the periodic blink only make sense on the plain
  // `normal` face — fancy expressions (celebrate, premium, love, etc.) have
  // their own eye artwork and would flash jarringly if we overrode them.
  const isWanderable = expression === 'normal';

  // Gentle bob — runs regardless of expression
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(floatY, { toValue: -8, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(floatY, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  // Wandering pupils — only for normal face
  useEffect(() => {
    if (!isWanderable) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const wander = () => {
      if (cancelled) return;
      setLookX((Math.random() - 0.5) * 1.2);
      setLookY((Math.random() - 0.5) * 0.8);
      const next = 2000 + Math.random() * 1500;
      timeoutId = setTimeout(wander, next);
    };
    timeoutId = setTimeout(wander, 800);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isWanderable]);

  // Periodic blink — only for normal face
  useEffect(() => {
    if (!isWanderable) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const blinkOnce = () => {
      if (cancelled) return;
      setEyesClosed(true);
      setTimeout(() => {
        if (!cancelled) setEyesClosed(false);
      }, 150);
      const next = 3000 + Math.random() * 3000;
      timeoutId = setTimeout(blinkOnce, next);
    };
    timeoutId = setTimeout(blinkOnce, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isWanderable]);

  // When the eyes are "closed" we temporarily swap to the sleeping
  // expression which draws closed eyelid paths; otherwise use whatever the
  // player has equipped. Pupils track lookOffset during open-eye frames.
  const effectiveExpression: BlinkExpression = isWanderable && eyesClosed ? 'sleeping' : expression;

  return (
    <RNAnimated.View style={{ transform: [{ translateY: floatY }] }}>
      <Blink
        expression={effectiveExpression}
        size={size}
        lookOffset={isWanderable ? { x: lookX, y: lookY } : undefined}
      />
    </RNAnimated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function StatsSpaceScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const store = useGameStore();
  const subscribed = store.isSubscribed();

  // Pick the data source: real for subscribers, sample for free users.
  const analytics = useMemo(() => {
    if (subscribed) {
      const input = {
        levelProgress: store.levelProgress,
        completedScores: store.completedScores,
        streakCount: store.streakCount,
        bestStreak: store.bestStreak,
        daysPlayed: store.daysPlayed,
        totalStars: store.totalStars,
        highestWorld: store.highestWorld,
      };
      const memoryScore = computeMemoryScore(input);
      const brainProfile = computeBrainProfile(input);
      return {
        memoryScore,
        percentile: estimatePercentile(memoryScore),
        statCards: computeStatCards(input),
        brainProfile,
        insight: generateInsight(brainProfile),
      };
    }
    return SAMPLE_ANALYTICS;
  }, [
    subscribed,
    store.levelProgress,
    store.completedScores,
    store.streakCount,
    store.bestStreak,
    store.daysPlayed,
    store.totalStars,
    store.highestWorld,
  ]);

  const memoryScoreAnimated = useCountUp(analytics.memoryScore, 1500, 500);

  // Which Blink expression is the player currently wearing?
  const equippedExpr = getExpressionById(store.equippedExpression);
  const blinkExpression: BlinkExpression = equippedExpr?.blinkExpression ?? 'normal';

  // Free user blur overlay — delayed so they see the sample data first.
  const [showBlur, setShowBlur] = useState(false);
  const blurOpacity = useRef(new RNAnimated.Value(0)).current;
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false);

  useEffect(() => {
    if (subscribed) return;
    const t = setTimeout(() => {
      setShowBlur(true);
      RNAnimated.timing(blurOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }).start();
    }, 2500);
    return () => clearTimeout(t);
  }, [subscribed, blurOpacity]);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setShowPaywall(false);
    // Previously this bypassed RevenueCat and just flipped the local
    // `subscriptionStatus` flag — a dev stub that accidentally
    // shipped. Users who tapped Subscribe from the Memory Analytics
    // teaser got Blanked+ without being charged. Now routed through
    // the real StoreKit purchase like shop.tsx.
    const { result, periodType } = await purchaseSubscription(plan);
    if (result === 'cancelled') return;
    if (result === 'error') {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      return;
    }
    const s = useGameStore.getState();
    s.activatePlus();
    s.unlockCosmetic('frame_premium_gold');
    s.unlockCosmetic('expr_premium');
    s.unlockCosmetic('banner_premium_gold');
    if (periodType !== 'trial' && periodType !== 'intro') {
      s.maybeGrantMonthlyPlusGems();
    }
    // Fade the blur away so the real stats are revealed.
    RNAnimated.timing(blurOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setShowBlur(false);
      setShowPremiumCelebration(true);
    });
  };

  const cards = analytics.statCards;
  const STAT_ANIMATE = subscribed; // Free users see the sample instantly so the preview feels snappy.

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Floating shape environment */}
      <FloatingShapes opacity={theme.shapeOpacity} />

      {/* Soft centre glow */}
      <LinearGradient
        colors={[theme.glow, 'transparent']}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.backBg }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={theme.backColor} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.title }]}>Memory Analytics</Text>
          {subscribed ? (
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.badgeText, { color: theme.badgeText }]}>BLANKED+</Text>
            </View>
          ) : (
            <View style={styles.badgePlaceholder} />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Blink centrepiece */}
          <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.blinkWrapper}>
            <FloatingBlink expression={blinkExpression} size={110} />
          </Animated.View>

          {/* Memory score */}
          <View style={styles.scoreWrapper}>
            <Text style={[styles.scoreLabel, { color: theme.muted }]}>MEMORY SCORE</Text>
            <Text style={[styles.scoreValue, { color: theme.title }]}>
              {memoryScoreAnimated}
            </Text>
            <Animated.Text
              entering={FadeIn.duration(400).delay(800)}
              style={[styles.scoreSub, { color: theme.scoreSub }]}
            >
              Top {analytics.percentile}% of players
            </Animated.Text>
          </View>

          {!subscribed && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.sampleWatermark, { borderColor: theme.muted + '33' }]}
            >
              <Text style={[styles.sampleWatermarkText, { color: theme.muted }]}>
                SAMPLE DATA
              </Text>
            </Animated.View>
          )}

          {/* Stat cards — 2 rows of 3 */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatsCard
                icon="🎯"
                value={cards.accuracy}
                suffix="%"
                label="Accuracy"
                color="#00B894"
                theme={theme}
                delay={1000}
                animate={STAT_ANIMATE}
              />
              <StatsCard
                icon="🔥"
                value={cards.bestStreak}
                label="Best Streak"
                color="#FF6B6B"
                theme={theme}
                delay={1150}
                animate={STAT_ANIMATE}
              />
              <StatsCard
                icon="⭐"
                value={cards.stars}
                label="Stars"
                color="#D4A012"
                theme={theme}
                delay={1300}
                animate={STAT_ANIMATE}
              />
            </View>
            <View style={styles.statsRow}>
              <StatsCard
                icon="🧩"
                value={cards.levelsDone}
                label="Levels Done"
                color="#0984E3"
                theme={theme}
                delay={1450}
                animate={STAT_ANIMATE}
              />
              <StatsCard
                icon="⚡"
                value={cards.avgSpeed}
                suffix="s"
                decimals={1}
                label="Avg Speed"
                color="#00CEC9"
                theme={theme}
                delay={1600}
                animate={STAT_ANIMATE}
              />
              <StatsCard
                icon="📅"
                value={cards.daysActive}
                label="Days Active"
                color="#FD79A8"
                theme={theme}
                delay={1750}
                animate={STAT_ANIMATE}
              />
            </View>
          </View>

          {/* Radar chart */}
          <Animated.View entering={FadeIn.duration(500).delay(1900)}>
            <BrainRadarChart
              profile={analytics.brainProfile}
              size={Math.min(SCREEN_W - 32, 320)}
              accent={ACCENT}
              theme={theme}
            />
          </Animated.View>

          {/* Insight card */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(2100)}
            style={[
              styles.insightCard,
              { backgroundColor: theme.insightBg, borderColor: theme.insightBorder },
            ]}
          >
            <Text style={styles.insightEmoji}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: theme.insightText }]}>
                {analytics.insight.title}
              </Text>
              <Text style={[styles.insightBody, { color: theme.insightSub }]}>
                {analytics.insight.body}
              </Text>
            </View>
          </Animated.View>

          {/* Bottom padding so the scroll doesn't clip under the blur */}
          <View style={{ height: subscribed ? 24 : SCREEN_H * 0.4 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Free-user blur + conversion overlay */}
      {!subscribed && showBlur && (
        <RNAnimated.View
          pointerEvents="box-none"
          style={[
            styles.blurWrapper,
            { opacity: blurOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              theme.blurOverlay.replace(/0\.95\)$/, '0.80)'),
              theme.blurOverlay,
              theme.blurOverlay,
            ]}
            locations={[0, 0.15, 0.35, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.conversionContent}>
            <Blink expression="celebrate" size={50} />
            <Text style={[styles.conversionTitle, { color: theme.title }]}>Like what you see?</Text>
            <Text style={[styles.conversionBody, { color: theme.subtitle }]}>
              Unlock Memory Analytics with Blanked+ and track your real brain performance over time.
            </Text>
            <Pressable
              onPress={() => setShowPaywall(true)}
              style={({ pressed }) => [
                styles.upgradeBtn,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
              ]}
            >
              <LinearGradient
                colors={['#6C5CE7', '#A29BFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <Text style={styles.upgradeText}>Upgrade to Blanked+</Text>
              </LinearGradient>
            </Pressable>
            <Text style={[styles.upgradeSub, { color: theme.muted }]}>
              Includes unlimited lives, 300 gems/month, and more
            </Text>
          </View>
        </RNAnimated.View>
      )}

      {/* Post-purchase celebration (simple fade, the big celebration belongs
         elsewhere) — here we just acknowledge the unlock with a toast-style
         card at the top of the screen. Kept minimal intentionally; the main
         PremiumCelebration is already shown after purchase in other screens
         and we don't want to double it up if the player came from the shop. */}
      {showPremiumCelebration && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.celebrate, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
        >
          <Text style={{ fontSize: 18 }}>✨</Text>
          <Text style={[styles.celebrateText, { color: theme.title }]}>
            Welcome to Blanked+! Your real stats are loading…
          </Text>
          <Pressable onPress={() => setShowPremiumCelebration(false)} hitSlop={10}>
            <Ionicons name="close" size={18} color={theme.muted} />
          </Pressable>
        </Animated.View>
      )}

      <SubscriptionPaywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  badgePlaceholder: { width: 58 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, alignItems: 'stretch' },

  blinkWrapper: {
    alignSelf: 'center',
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreWrapper: {
    alignItems: 'center',
    marginTop: 14,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 50,
  },
  scoreSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  sampleWatermark: {
    alignSelf: 'flex-end',
    marginTop: -38,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sampleWatermarkText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  statsGrid: { marginTop: 28, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 26,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  insightEmoji: { fontSize: 22, marginTop: 2 },
  insightTitle: { fontSize: 14, fontWeight: '800' },
  insightBody: { fontSize: 12, marginTop: 3, lineHeight: 17 },

  blurWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  conversionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  conversionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  conversionBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
    marginBottom: 4,
  },
  upgradeBtn: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 6,
  },
  upgradeGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upgradeSub: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },

  celebrate: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  celebrateText: { fontSize: 12, flex: 1, fontWeight: '600' },
});
