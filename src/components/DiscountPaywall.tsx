/**
 * Second-chance discount paywall — only shown during onboarding when
 * the user dismisses the regular SubscriptionPaywall. Promotes the
 * monthly intro offer (£2.99 first month, then full price) with a
 * 10-minute countdown for urgency.
 *
 * The countdown is conversion theatre: the actual intro-offer
 * eligibility is StoreKit-managed and isn't time-limited per
 * session. After the timer hits zero we lock the CTA so the urgency
 * is at least real-within-this-session — flashing "OFFER EXPIRED"
 * is more honest than letting the user tap and still get the deal.
 *
 * The discount paywall is shown ONCE per device. After dismissal
 * (or expiry-then-dismissal), the AsyncStorage flag
 * `blanked_discount_paywall_seen` prevents it from reappearing.
 * That keeps it tied to onboarding and avoids it spamming returning
 * users on every paywall dismissal.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Dimensions, Animated as RNAnimated, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { getSubscriptionOfferings, type SubscriptionPrice } from '@/src/lib/purchases';
import { track, EVENTS } from '@/src/lib/analytics';
import { t } from '@/src/i18n';

const { width: SW, height: SH } = Dimensions.get('window');
const ACCENT = '#6C5CE7';
const URGENT = '#FF6B6B';

// 10-minute countdown — long enough to feel like a real offer window,
// short enough to drive a "use it or lose it" tap. The timer regenerates
// fresh each time the paywall mounts, but the AsyncStorage gate above
// means it can only mount once per device anyway.
const COUNTDOWN_SECONDS = 10 * 60;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubscribe: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DiscountPaywall({ visible, onDismiss, onSubscribe }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [monthlyPkg, setMonthlyPkg] = useState<SubscriptionPrice | null>(null);

  // Pull the regular monthly price so we can show the strike-through
  // alongside the £2.99 intro. Falls back to GBP £5.99 if RC isn't
  // available — same fallback as the main paywall.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getSubscriptionOfferings().then(({ monthly }) => {
      if (!cancelled) setMonthlyPkg(monthly);
    });
    return () => { cancelled = true; };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 10, tension: 55, useNativeDriver: true }).start();
      track(EVENTS.PAYWALL_SHOWN, { variant: 'discount' });
      setSecondsLeft(COUNTDOWN_SECONDS);
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible]);

  // Tick once per second while visible.
  useEffect(() => {
    if (!visible) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [visible, secondsLeft]);

  const expired = secondsLeft <= 0;
  // The monthly full price is shown struck-through next to the intro
  // amount. We don't try to "localise" the £2.99 string — it's the
  // intro-offer price configured in App Store Connect, and Apple's
  // own offer pricing UI handles the locale conversion at purchase
  // time. The fallback display here is for the in-paywall preview only.
  const fullPriceString = monthlyPkg?.priceString ?? '£5.99';

  function handleDismiss() {
    track(EVENTS.PAYWALL_DISMISSED, { variant: 'discount' });
    RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  }

  function handleSubscribe() {
    if (expired) {
      Alert.alert(t('paywall.discount.expired_title'), t('paywall.discount.expired_body'));
      return;
    }
    onSubscribe();
  }

  if (!visible) return null;

  const sheetBg = isDark ? '#0F1020' : '#FFFFFF';
  const textColor = isDark ? '#F5F5F7' : '#1A1A18';
  const subTextColor = isDark ? 'rgba(255,255,255,0.55)' : '#636E72';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={[st.webCenter, { backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.4)' : 'transparent' }]}>
        <RNAnimated.View style={[st.fullScreen, { backgroundColor: sheetBg }, { transform: [{ translateY: slideAnim }] }]}>
          {/* Coral / red gradient header — different from the regular
              purple paywall to telegraph "this is a different offer". */}
          <LinearGradient
            colors={['#FF6B6B', '#FF8C8C', '#D14545']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[st.header, { paddingTop: Math.max(insets.top + 8, 24) }]}
          >
            <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
            </Pressable>

            <View style={st.logoCircle}>
              <AnimatedBlink expression="celebrate" size={50} entrance="spring" />
            </View>
            <Text style={st.headerTitle}>{t('paywall.discount.title')}</Text>
            <Text style={st.headerSub}>{t('paywall.discount.subtitle')}</Text>
          </LinearGradient>

          <View style={[st.content, { backgroundColor: sheetBg }]}>
            {/* Countdown pill */}
            <View style={[st.countdownPill, { backgroundColor: expired ? 'rgba(255,107,107,0.12)' : 'rgba(255,107,107,0.16)' }]}>
              <Ionicons name="time-outline" size={16} color={URGENT} />
              <Text style={[st.countdownLabel, { color: URGENT }]}>
                {expired ? t('paywall.discount.expired_pill') : t('paywall.discount.expires_in', { time: formatCountdown(secondsLeft) })}
              </Text>
            </View>

            {/* Big price card */}
            <View style={[st.priceCard, { borderColor }]}>
              <Text style={[st.priceCardLabel, { color: subTextColor }]}>{t('paywall.discount.first_month_label')}</Text>
              <View style={st.priceRow}>
                <Text style={[st.priceCrossed, { color: subTextColor }]}>{fullPriceString}</Text>
                <Text style={[st.priceBig, { color: textColor }]}>{t('paywall.discount.intro_price')}</Text>
              </View>
              <Text style={[st.priceFootnote, { color: subTextColor }]}>{t('paywall.discount.then_full_price', { price: fullPriceString })}</Text>
            </View>

            {/* Quick recap of what they're getting */}
            <View style={st.benefits}>
              <BenefitDot text={t('paywall.benefits.double_gems_title')} textColor={textColor} />
              <BenefitDot text={t('paywall.benefits.lives_title')} textColor={textColor} />
              <BenefitDot text={t('paywall.benefits.no_ads_title')} textColor={textColor} />
              <BenefitDot text={t('paywall.benefits.gems_title')} textColor={textColor} />
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleSubscribe}
              disabled={expired}
              style={({ pressed }) => [
                st.ctaBtn,
                { backgroundColor: expired ? '#B2BEC3' : URGENT },
                pressed && !expired && { opacity: 0.88, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={st.ctaText}>
                {expired ? t('paywall.discount.cta_expired') : t('paywall.discount.cta', { price: t('paywall.discount.intro_price') })}
              </Text>
            </Pressable>

            <Text style={[st.disclosure, { color: subTextColor }]}>
              {t('paywall.discount.disclosure', { price: fullPriceString })}
            </Text>

            <Pressable onPress={handleDismiss} hitSlop={8} style={st.continueFreeBtn}>
              <Text style={[st.continueFreeText, { color: subTextColor }]}>{t('paywall.discount.continue_free')}</Text>
            </Pressable>
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

function BenefitDot({ text, textColor }: { text: string; textColor: string }) {
  return (
    <View style={st.benefitDot}>
      <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
      <Text style={[st.benefitDotText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

export default DiscountPaywall;

const st = StyleSheet.create({
  webCenter: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.4)' : 'transparent' },
  fullScreen: {
    flex: 1, width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 30 } : {}),
  },
  header: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', position: 'relative' },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 14, right: 16, zIndex: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 54, height: 54, borderRadius: 27, marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 4, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },

  countdownPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16 },
  countdownLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  priceCard: {
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18,
    alignItems: 'center', marginBottom: 18,
  },
  priceCardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 6 },
  priceCrossed: { fontSize: 18, fontWeight: '600', textDecorationLine: 'line-through' },
  priceBig: { fontSize: 36, fontWeight: '900' },
  priceFootnote: { fontSize: 12, textAlign: 'center', marginTop: 2 },

  benefits: { gap: 8, marginBottom: 22 },
  benefitDot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitDotText: { fontSize: 14, fontWeight: '600' },

  ctaBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: URGENT, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 18, elevation: 6,
    marginBottom: 12,
  },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  disclosure: { fontSize: 11, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8, marginBottom: 16 },

  continueFreeBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  continueFreeText: { fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
});
