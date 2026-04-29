/**
 * Blanked+ Subscription Paywall — Full-screen modal.
 * Stacked plan cards, shimmer CTA, staggered animations.
 *
 * Yearly plan ships with a 7-day free trial intro offer (configured
 * in App Store Connect + RevenueCat). Monthly plan has no trial.
 * The trial badge is only rendered when StoreKit confirms the user
 * is eligible (`isTrialEligible(productId)`), so an ineligible
 * reviewer doesn't see "7 days free" while StoreKit refuses to
 * grant it. The previously-rejected build 21 had the badge
 * unconditionally — the eligibility check is the safeguard.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  Dimensions, Animated as RNAnimated, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { restorePurchases, getSubscriptionOfferings, formatCurrency, isTrialEligible, type SubscriptionPrice } from '@/src/lib/purchases';
import { IAP_PRODUCT_IDS } from '@/src/data/iapProducts';
import { track, EVENTS } from '@/src/lib/analytics';
import { useGameStore } from '@/src/store';
import { t } from '@/src/i18n';

const { width: SW, height: SH } = Dimensions.get('window');
const ACCENT = '#6C5CE7';

// ── Theme palettes ──────────────────────────────────────────────────
// Everything that varies between light/dark lives here. The purple
// gradient header stays the same across both themes because the
// Blanked+ brand colour reads well on either background.
interface PaywallPalette {
  modalBg: string;
  sheetBg: string;
  sheetShadow: string;
  contentBg: string;
  benefitBorder: string;
  benefitTitle: string;
  benefitDesc: string;
  planBorder: string;
  planBg: string;
  planNameInactive: string;
  planNameActive: string;
  planSubInactive: string;
  planSubActive: string;
  planPriceInactive: string;
  planPriceActive: string;
  radioBorder: string;
  reassuranceMuted: string;
  legalMuted: string;
  legalDot: string;
}

const LIGHT: PaywallPalette = {
  modalBg: 'rgba(0,0,0,0.4)',
  sheetBg: '#FFFFFF',
  sheetShadow: '#000',
  contentBg: '#FFFFFF',
  benefitBorder: 'rgba(0,0,0,0.04)',
  benefitTitle: '#1A1A18',
  benefitDesc: '#636E72',
  planBorder: '#E8E6E3',
  planBg: '#FAFAF8',
  planNameInactive: '#636E72',
  planNameActive: '#1A1A18',
  planSubInactive: '#B2BEC3',
  planSubActive: '#636E72',
  planPriceInactive: '#B2BEC3',
  planPriceActive: '#1A1A18',
  radioBorder: '#D0CEC8',
  reassuranceMuted: '#636E72',
  legalMuted: '#B2BEC3',
  legalDot: '#D0CEC8',
};

const DARK: PaywallPalette = {
  modalBg: 'rgba(0,0,0,0.65)',
  sheetBg: '#0F1020',
  sheetShadow: '#000',
  contentBg: '#0F1020',
  benefitBorder: 'rgba(255,255,255,0.08)',
  benefitTitle: '#F5F5F7',
  benefitDesc: 'rgba(255,255,255,0.55)',
  planBorder: 'rgba(255,255,255,0.12)',
  planBg: '#1A1B2E',
  planNameInactive: 'rgba(255,255,255,0.5)',
  planNameActive: '#FFFFFF',
  planSubInactive: 'rgba(255,255,255,0.3)',
  planSubActive: 'rgba(255,255,255,0.6)',
  planPriceInactive: 'rgba(255,255,255,0.35)',
  planPriceActive: '#FFFFFF',
  radioBorder: 'rgba(255,255,255,0.3)',
  reassuranceMuted: 'rgba(255,255,255,0.55)',
  legalMuted: 'rgba(255,255,255,0.35)',
  legalDot: 'rgba(255,255,255,0.2)',
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

// ── SVG Icons ─────────────────────────────────────────────────────────
function EyeLogoSvg() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="#FFF" strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={3} fill="#FFF" />
      <Circle cx={12} cy={12} r={1.2} fill={ACCENT} />
    </Svg>
  );
}
function HeartSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FF6B6B" />
    </Svg>
  );
}
function GemSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" fill={ACCENT} opacity={0.15} />
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" stroke={ACCENT} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
function StarSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#D4A012" />
    </Svg>
  );
}
function NoAdsSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke="#0984E3" strokeWidth={1.8} />
      <Path d="M3 3l18 18" stroke="#0984E3" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
/** Rising trend-line + corner arrow tip — the "your sharpness is
 *  climbing" signal. Reads at 18px as an upward stock-chart line.
 *  Path geometry is balanced around the 24×24 viewBox centre (12,12)
 *  so the icon sits cleanly in the 36×36 row badge without leaning
 *  to one side. Stroke width matches the visual weight of the filled
 *  heart/gem/star icons sitting below it in the row. Purple accent to
 *  hook into the brand without competing with the utility-benefit
 *  colours (gold / coral / blue) further down the list. */
function ProgressChartSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 19 L9 13 L13 15 L21 5"
        stroke={ACCENT}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 5 L21 5 L21 10"
        stroke={ACCENT}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Benefits data ─────────────────────────────────────────────────────
// Benefits resolve t() at render time — each row's title + desc
// re-read on locale flip without a remount.
//
// Order matters. The 35-65 audience installs Blanked because they want
// to feel mentally sharp — not because they want more gems. So the
// emotional anchor (memory analytics → 'see your sharpness grow') sits
// at the TOP, where the eye lands first. The gem / lives / no-ads
// rows that follow read as the practical bonus stack on top of the
// real reason to subscribe.
const BENEFIT_KEYS = [
  { Icon: ProgressChartSvg, color: ACCENT, titleKey: 'paywall.benefits.analytics_title', descKey: 'paywall.benefits.analytics_desc' },
  { Icon: GemSvg, color: '#D4A012', titleKey: 'paywall.benefits.double_gems_title', descKey: 'paywall.benefits.double_gems_desc' },
  { Icon: HeartSvg, color: '#FF6B6B', titleKey: 'paywall.benefits.lives_title', descKey: 'paywall.benefits.lives_desc' },
  { Icon: GemSvg, color: ACCENT, titleKey: 'paywall.benefits.gems_title', descKey: 'paywall.benefits.gems_desc' },
  { Icon: StarSvg, color: '#D4A012', titleKey: 'paywall.benefits.powerup_title', descKey: 'paywall.benefits.powerup_desc' },
  { Icon: NoAdsSvg, color: '#0984E3', titleKey: 'paywall.benefits.no_ads_title', descKey: 'paywall.benefits.no_ads_desc' },
] as const;

// ── Shimmer Button ────────────────────────────────────────────────────
function ShimmerButton({ text, onPress }: { text: string; onPress: () => void }) {
  const shimmer = useRef(new RNAnimated.Value(-0.3)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.timing(shimmer, { toValue: 1.3, duration: 2500, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-80, SW + 80] });
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.shimmerBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
      <RNAnimated.View style={[st.shimmerStripe, { transform: [{ translateX }, { skewX: '-20deg' }] }]} />
      <Text style={st.shimmerText}>{text}</Text>
    </Pressable>
  );
}

// ── Animated Benefit Row ──────────────────────────────────────────────
function BenefitRow({ item, index, palette }: { item: typeof BENEFIT_KEYS[number]; index: number; palette: PaywallPalette }) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(16)).current;
  const checkScale = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const delay = index * 70;
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      RNAnimated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
    RNAnimated.spring(checkScale, { toValue: 1, friction: 4, tension: 180, delay: delay + 300, useNativeDriver: true }).start();
  }, []);

  return (
    <RNAnimated.View style={[st.benefitRow, { borderBottomColor: palette.benefitBorder, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[st.benefitIcon, { backgroundColor: item.color + '18' }]}>
        <item.Icon />
      </View>
      <View style={st.benefitText}>
        <Text style={[st.benefitTitle, { color: palette.benefitTitle }]}>{t(item.titleKey)}</Text>
        <Text style={[st.benefitDesc, { color: palette.benefitDesc }]}>{t(item.descKey)}</Text>
      </View>
      <RNAnimated.View style={{ transform: [{ scale: checkScale }] }}>
        <Ionicons name="checkmark-circle" size={18} color="#00B894" />
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────
function SubscriptionPaywall({ visible, onDismiss, onSubscribe }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const palette: PaywallPalette = isDark ? DARK : LIGHT;
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;

  // Real prices from RevenueCat — localised to the user's Apple ID
  // region. "£19.99" in the UK, "€19.99" in Spain, "US$19.99" in the
  // US, etc. Fetched once when the paywall opens; null while loading
  // or on web/simulator where RC isn't available. We render fallback
  // GBP values until these resolve so the modal never blanks out.
  const [monthlyPkg, setMonthlyPkg] = useState<SubscriptionPrice | null>(null);
  const [annualPkg, setAnnualPkg] = useState<SubscriptionPrice | null>(null);
  // Trial eligibility for the yearly plan, queried from StoreKit via
  // RevenueCat. Only true when the Apple ID has not previously
  // redeemed an intro offer on this product. Drives the "7 days free"
  // badge — we never advertise a trial to a user who can't claim one,
  // which is what got build 21 rejected.
  const [yearlyTrialEligible, setYearlyTrialEligible] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getSubscriptionOfferings().then(({ monthly, annual }) => {
      if (cancelled) return;
      setMonthlyPkg(monthly);
      setAnnualPkg(annual);
    });
    isTrialEligible(IAP_PRODUCT_IDS.PLUS_YEARLY).then((eligible) => {
      if (!cancelled) setYearlyTrialEligible(eligible);
    });
    return () => { cancelled = true; };
  }, [visible]);

  // Display strings. Fall back to GBP baseline on web or when the RC
  // fetch hasn't resolved yet — the App Store will show the real local
  // price when StoreKit actually charges, and this fallback only
  // flashes briefly on the first paywall open.
  const monthlyPriceString = monthlyPkg?.priceString ?? '£5.99';
  const annualPriceString = annualPkg?.priceString ?? '£29.99';
  // Monthly-equivalent of the annual plan (e.g. £29.99/12 = £2.50).
  // Computed from the annual plan's numeric price + currency code so
  // it always uses the same currency as the displayed annual price.
  const annualMonthlyEq = annualPkg
    ? formatCurrency(annualPkg.price / 12, annualPkg.currencyCode)
    : '£2.50';
  // Savings vs 12 × monthly. Shown on the yearly plan card's header.
  // Example: monthly £5.99 × 12 = £71.88, annual £29.99 → saves £41.89.
  // If either price is missing we fall back to a plain "Yearly" label
  // so the badge doesn't claim a made-up discount.
  const annualSavings = (monthlyPkg && annualPkg && monthlyPkg.currencyCode === annualPkg.currencyCode)
    ? formatCurrency(Math.max(0, monthlyPkg.price * 12 - annualPkg.price), annualPkg.currencyCode)
    : null;

  // Pulsing glow for selected plan
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        RNAnimated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 10, tension: 55, useNativeDriver: true }).start();
      // Fire once per open so we can measure impression → conversion.
      track(EVENTS.PAYWALL_SHOWN);
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible]);

  const router = useRouter();

  function handleDismiss() {
    // Track dismissal BEFORE animating out so the event goes even if
    // the user force-closes the app mid-animation.
    track(EVENTS.PAYWALL_DISMISSED, { plan });
    RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  }

  // Apple guideline 3.1.1 (in-app purchase): the paywall must offer a
  // functional Restore Purchases action. Previously both "Restore"
  // pressables just dismissed the modal — that's a hard reject.
  async function handleRestore() {
    try {
      const status = await restorePurchases();
      const store = useGameStore.getState();
      // Sync EVERY entitlement that came back. Previously the
      // noAds branch surfaced the toast but didn't flip
      // adsRemoved on the store, so the user kept seeing ads.
      if (status.plus) store.activatePlus(status.periodType);
      if (status.noAds) store.setAdsRemoved();

      if (status.plus) {
        // Re-entering a subscription (restore on a new device,
        // after reinstall, etc.): if it's been >30 days since the
        // last grant the cooldown check will credit the next
        // month's 100 gems. The store-level guard skips during
        // trial / intro — the next foreground-cycle check will
        // pick it up once the subscription converts to paid.
        store.maybeGrantMonthlyPlusGems();
        handleDismiss();
        Alert.alert(t('settings.purchases.restored_title'), t('settings.purchases.restored_plus'));
      } else if (status.noAds) {
        handleDismiss();
        Alert.alert(t('settings.purchases.restored_title'), t('settings.purchases.restored_ads'));
      } else {
        Alert.alert(t('paywall.nothing_title'), t('paywall.nothing_body'));
      }
    } catch {
      Alert.alert(t('paywall.restore_failed_title'), t('paywall.restore_failed_body'));
    }
  }

  // Legal links need real handlers for Apple 3.1.2(c). Terms of Use
  // opens Apple's standard EULA (the agreement declared in App Store
  // Connect) so the in-app link matches the store listing. Privacy
  // opens the app's own privacy policy.
  function openTerms() { handleDismiss(); setTimeout(() => router.push('/eula'), 260); }
  function openPrivacy() { handleDismiss(); setTimeout(() => router.push('/privacy'), 260); }

  if (!visible) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] });
  // CTA text adapts to trial eligibility: "Start free trial" when the
  // user qualifies on the yearly plan, regular "Subscribe" otherwise.
  // The renewal disclosure below the CTA carries the actual price + cadence.
  const ctaText = plan === 'yearly'
    ? (yearlyTrialEligible
        ? t('paywall.cta_yearly_trial', { price: annualPriceString })
        : t('paywall.cta_yearly', { price: annualPriceString }))
    : t('paywall.cta_monthly', { price: monthlyPriceString });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={[st.webCenter, { backgroundColor: Platform.OS === 'web' ? palette.modalBg : 'transparent' }]}>
      <RNAnimated.View style={[st.fullScreen, { backgroundColor: palette.sheetBg, shadowColor: palette.sheetShadow }, { transform: [{ translateY: slideAnim }] }]}>
        {/* Purple gradient header — unchanged across themes (brand colour
            reads well on both light and dark) */}
        <LinearGradient
          colors={['#6C5CE7', '#A29BFE', '#4A3BBF']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[st.header, { paddingTop: Math.max(insets.top + 8, 24) }]}
        >
          <Pressable style={st.restoreBtn} onPress={handleRestore} hitSlop={12}>
            <Text style={st.restoreText}>{t('paywall.restore')}</Text>
          </Pressable>
          <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
          </Pressable>

          {/* Logo */}
          <View style={st.logoCircle}>
            <AnimatedBlink expression="celebrate" size={50} entrance="spring" />
          </View>
          <Text style={st.headerTitle}>Blanked<Text style={{ fontWeight: '400', opacity: 0.75 }}>+</Text></Text>
          <Text style={st.headerSub}>{t('paywall.header_sub')}</Text>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={[st.content, { backgroundColor: palette.contentBg }]} contentContainerStyle={[st.contentInner, { paddingBottom: Math.max(insets.bottom + 12, 28) }]} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Benefits */}
          {BENEFIT_KEYS.map((b, i) => <BenefitRow key={i} item={b} index={i} palette={palette} />)}

          {/* Plan cards — stacked */}
          <View style={st.planSection}>
            {/* Yearly */}
            <Pressable
              onPress={() => { setPlan('yearly'); }}
              style={[
                st.planCard,
                { borderColor: palette.planBorder, backgroundColor: palette.planBg },
                plan === 'yearly' && { borderColor: ACCENT, borderWidth: 2, backgroundColor: isDark ? ACCENT + '18' : ACCENT + '06' },
              ]}
            >
              {plan === 'yearly' && <RNAnimated.View style={[st.planGlow, { opacity: glowOpacity }]} />}
              <View style={[st.planRadio, { borderColor: palette.radioBorder }, plan === 'yearly' && st.planRadioActive]}>
                {plan === 'yearly' && <View style={st.planRadioDot} />}
              </View>
              <View style={st.planLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[st.planName, { color: palette.planNameInactive }, plan === 'yearly' && { color: palette.planNameActive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{annualSavings ? t('paywall.plans.yearly_save', { savings: annualSavings }) : t('paywall.plans.yearly')}</Text>
                  <View style={st.bestValueBadge}><Text style={st.bestValueText} numberOfLines={1}>{t('paywall.plans.best_value')}</Text></View>
                </View>
                <Text style={[st.planSub, { color: palette.planSubInactive }, plan === "yearly" && { color: palette.planSubActive }]}>{t('paywall.plans.yearly_sub', { price: annualMonthlyEq })}</Text>
                {yearlyTrialEligible && (
                  <Text style={[st.trialBadge, { color: '#00B894' }]}>{t('paywall.plans.yearly_trial_badge')}</Text>
                )}
              </View>
              <Text style={[st.planPrice, { color: palette.planPriceInactive }, plan === 'yearly' && { color: palette.planPriceActive }]}>{annualPriceString}<Text style={st.planPricePer}>{t('paywall.plans.yearly_price_suffix')}</Text></Text>
            </Pressable>

            {/* Monthly */}
            <Pressable
              onPress={() => { setPlan('monthly'); }}
              style={[
                st.planCard,
                { borderColor: palette.planBorder, backgroundColor: palette.planBg },
                plan === 'monthly' && { borderColor: ACCENT, borderWidth: 2, backgroundColor: isDark ? ACCENT + '18' : ACCENT + '06' },
              ]}
            >
              {plan === 'monthly' && <RNAnimated.View style={[st.planGlow, { opacity: glowOpacity }]} />}
              <View style={[st.planRadio, { borderColor: palette.radioBorder }, plan === 'monthly' && st.planRadioActive]}>
                {plan === 'monthly' && <View style={st.planRadioDot} />}
              </View>
              <View style={st.planLeft}>
                <Text style={[st.planName, { color: palette.planNameInactive }, plan === 'monthly' && { color: palette.planNameActive }]}>{t('paywall.plans.monthly')}</Text>
              </View>
              <Text style={[st.planPrice, { color: palette.planPriceInactive }, plan === 'monthly' && { color: palette.planPriceActive }]}>{monthlyPriceString}<Text style={st.planPricePer}>{t('paywall.plans.monthly_price_suffix')}</Text></Text>
            </Pressable>
          </View>

          {/* Shimmer CTA */}
          <ShimmerButton text={ctaText} onPress={() => onSubscribe(plan)} />

          {/* Reassurance */}
          <View style={st.reassurance}>
            <Text style={[st.reassuranceGrey, { color: palette.reassuranceMuted }]}>{t('paywall.cancel_anytime')}</Text>
          </View>

          {/* Auto-renewal disclosure — required by Apple guideline 3.1.2.
              Must be near the purchase CTA and clearly state: length of
              subscription, price per period, auto-renewal, how to cancel.
              When a free trial is on offer, the disclosure must also
              state the trial duration + that the subscription auto-
              renews at full price after the trial ends. */}
          <Text style={[st.renewalDisclosure, { color: palette.legalMuted }]}>
            {plan === 'yearly'
              ? (yearlyTrialEligible
                  ? t('paywall.renewal_yearly_trial', { price: annualPriceString })
                  : t('paywall.renewal_yearly', { price: annualPriceString }))
              : t('paywall.renewal_monthly', { price: monthlyPriceString })}
          </Text>

          {/* Legal — functional links that route to the in-app WebView
              viewers. Restore is wired to the purchases library. */}
          <View style={st.legalRow}>
            <Pressable onPress={openTerms} hitSlop={8}><Text style={[st.legalLink, { color: palette.legalMuted }]}>{t('paywall.terms')}</Text></Pressable>
            <Text style={[st.legalDot, { color: palette.legalDot }]}>{'\u00B7'}</Text>
            <Pressable onPress={openPrivacy} hitSlop={8}><Text style={[st.legalLink, { color: palette.legalMuted }]}>{t('paywall.privacy')}</Text></Pressable>
            <Text style={[st.legalDot, { color: palette.legalDot }]}>{'\u00B7'}</Text>
            <Pressable onPress={handleRestore} hitSlop={8}><Text style={[st.legalLink, { color: palette.legalMuted }]}>{t('paywall.restore')}</Text></Pressable>
          </View>
        </ScrollView>
      </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default SubscriptionPaywall;

const st = StyleSheet.create({
  webCenter: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.4)' : 'transparent' },
  fullScreen: {
    flex: 1, backgroundColor: '#FFFFFF', width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 30 } : {}),
  },

  // Header
  // Trimmed paddingBottom (24 → 14) and logoCircle.marginTop (40 → 22)
  // to claw back ~28px of vertical space — that was previously eating
  // into the bottom Subscribe CTA on shorter phones (iPhone SE / 13
  // mini / 15) where the user reported the button being cut off.
  header: { paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center', position: 'relative' },
  restoreBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 16, left: 16, zIndex: 10 },
  restoreText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 14, right: 16, zIndex: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 54, height: 54, borderRadius: 27, marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  // Bumped from 13 → 14 + weight 600 + opacity 0.6 → 0.85 so the
  // "See your memory get sharper" hook actually reads on the gradient
  // bg. Pre-fix it was barely visible against the purple — defeating
  // the point of having a hook at all.
  headerSub: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.88)', letterSpacing: 0.1 },

  // Content
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  contentInner: { paddingHorizontal: 20, paddingTop: 12 },

  // Benefits
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  benefitIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A18' },
  benefitDesc: { fontSize: 11, color: '#636E72', marginTop: 1 },

  // Plans
  planSection: { gap: 8, marginTop: 14, marginBottom: 16 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E8E6E3', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: '#FAFAF8', position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: ACCENT, borderWidth: 2, backgroundColor: ACCENT + '06' },
  planGlow: {
    ...StyleSheet.absoluteFillObject, borderRadius: 14,
    backgroundColor: ACCENT, // opacity is animated
  },
  planRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D0CEC8', alignItems: 'center', justifyContent: 'center' },
  planRadioActive: { borderColor: ACCENT },
  planRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ACCENT },
  planLeft: { flex: 1 },
  planName: { fontSize: 15, fontWeight: '700', color: '#636E72' },
  planNameActive: { color: '#1A1A18' },
  planSub: { fontSize: 11, color: '#B2BEC3', marginTop: 1 },
  planSubActive: { color: '#636E72' },
  planPrice: { fontSize: 16, fontWeight: '800', color: '#B2BEC3' },
  planPriceActive: { color: '#1A1A18' },
  planPricePer: { fontSize: 11, fontWeight: '500' },
  bestValueBadge: { backgroundColor: '#FF6B6B', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  bestValueText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.8 },
  trialBadge: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // CTA
  shimmerBtn: {
    width: '100%', backgroundColor: ACCENT, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', overflow: 'hidden',
    shadowColor: ACCENT, shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 18, elevation: 6,
    marginBottom: 10,
  },
  shimmerStripe: { position: 'absolute', top: 0, bottom: 0, width: 50, backgroundColor: 'rgba(255,255,255,0.18)' },
  shimmerText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Reassurance
  reassurance: { alignItems: 'center', marginBottom: 14 },
  reassuranceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reassuranceGreen: { fontSize: 12, fontWeight: '600', color: '#00B894' },
  reassuranceGrey: { fontSize: 12, color: '#636E72' },

  // Legal
  // Auto-renewal disclosure sits above the Terms/Privacy/Restore row.
  // Apple's reviewer screen-records the paywall, so the disclosure +
  // links must be large enough to read at recording resolution.
  renewalDisclosure: { fontSize: 11, lineHeight: 15, textAlign: 'center', paddingHorizontal: 12, marginBottom: 10, marginTop: 6 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 4 },
  legalLink: { fontSize: 12, fontWeight: '500', textDecorationLine: 'underline' },
  legalDot: { fontSize: 12 },
});
