/**
 * Blanked+ Subscription Paywall — Full-screen, mobile-first, high-converting.
 * Inspired by top-grossing app paywalls (Plantum, Waterllama, Merlin).
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Dimensions, Animated as RNAnimated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

// ── Benefit data ──────────────────────────────────────────────────────
const BENEFITS = [
  { icon: 'heart' as const, text: 'Unlimited lives', bold: 'Unlimited', color: '#FF6B6B' },
  { icon: 'diamond' as const, text: '100 gems every month', bold: '100 gems', color: '#6C5CE7' },
  { icon: 'flash' as const, text: '1 free power-up daily', bold: 'free power-up', color: '#F9A825' },
  { icon: 'eye-off' as const, text: 'No ads, ever', bold: 'No ads', color: '#0984E3' },
  { icon: 'analytics' as const, text: 'Detailed memory analytics', bold: 'memory analytics', color: '#00B894' },
];

// ── Custom Eye Logo ───────────────────────────────────────────────────
function EyeLogo({ size = 56 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 }}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
        <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="#6C5CE7" strokeWidth={2} fill="none" />
        <Circle cx={12} cy={12} r={3.5} fill="#6C5CE7" />
        <Circle cx={12} cy={12} r={1.5} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

function SubscriptionPaywall({ visible, onDismiss, onSubscribe }: Props) {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible]);

  function handleDismiss() {
    RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  }

  if (!visible) return null;

  const yearlyPerWeek = '\u00A30.48';
  const monthlyPrice = '\u00A32.99';
  const yearlyPrice = '\u00A324.99';
  const yearlyMonthly = '\u00A32.08';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <RNAnimated.View style={[st.fullScreen, { transform: [{ translateY: slideAnim }] }]}>
        {/* ── Top: Purple gradient area ── */}
        <LinearGradient
          colors={['#7C6CF0', '#6C5CE7', '#5B4CC8']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[st.topSection, { paddingTop: Math.max(insets.top + 8, 20) }]}
        >
          {/* Close */}
          <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          {/* Restore */}
          <Pressable style={st.restoreTopBtn} onPress={handleDismiss} hitSlop={12}>
            <Text style={st.restoreTopText}>Restore</Text>
          </Pressable>

          {/* Logo + Title */}
          <View style={st.heroArea}>
            <EyeLogo size={60} />
            <Text style={st.heroTitle}>
              Train your brain{'\n'}with <Text style={{ fontWeight: '900' }}>Blanked+</Text>
            </Text>
          </View>

          {/* Benefits */}
          <View style={st.benefitsList}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={st.benefitRow}>
                <View style={[st.benefitDot, { backgroundColor: b.color + '30' }]}>
                  <Ionicons name={b.icon} size={14} color={b.color} />
                </View>
                <Text style={st.benefitText}>
                  {b.text.split(b.bold).map((part, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <Text style={st.benefitBold}>{b.bold}</Text>}
                      {part}
                    </React.Fragment>
                  ))}
                </Text>
              </View>
            ))}
          </View>

          {/* Decorative circles */}
          <View style={[st.deco, { top: 20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
          <View style={[st.deco, { top: 60, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' }]} />
          <View style={[st.deco, { bottom: -10, left: 40, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        </LinearGradient>

        {/* ── Bottom: White card area ── */}
        <View style={[st.bottomSection, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
          {/* Plan cards side by side */}
          <View style={st.planRow}>
            {/* Free trial / Yearly */}
            <Pressable
              style={[st.planCard, plan === 'yearly' && st.planCardActive]}
              onPress={() => setPlan('yearly')}
            >
              {plan === 'yearly' && <View style={st.bestOfferBadge}><Text style={st.bestOfferText}>BEST OFFER</Text></View>}
              <View style={[st.planRadio, plan === 'yearly' && st.planRadioActive]}>
                {plan === 'yearly' && <View style={st.planRadioDot} />}
              </View>
              <Text style={[st.planLabel, plan === 'yearly' && st.planLabelActive]}>Free trial</Text>
              <Text style={[st.planSub, plan === 'yearly' && st.planSubActive]}>7 days</Text>
              <View style={st.planDivider} />
              <Text style={[st.planPriceMain, plan === 'yearly' && st.planPriceActive]}>{yearlyMonthly}<Text style={st.planPricePer}>/mo</Text></Text>
              <Text style={[st.planPriceAlt, plan === 'yearly' && st.planPriceAltActive]}>{yearlyPrice}/year</Text>
            </Pressable>

            {/* Monthly */}
            <Pressable
              style={[st.planCard, plan === 'monthly' && st.planCardActive]}
              onPress={() => setPlan('monthly')}
            >
              <View style={[st.planRadio, plan === 'monthly' && st.planRadioActive]}>
                {plan === 'monthly' && <View style={st.planRadioDot} />}
              </View>
              <Text style={[st.planLabel, plan === 'monthly' && st.planLabelActive]}>Monthly</Text>
              <Text style={[st.planSub, plan === 'monthly' && st.planSubActive]}>No commitment</Text>
              <View style={st.planDivider} />
              <Text style={[st.planPriceMain, plan === 'monthly' && st.planPriceActive]}>{monthlyPrice}<Text style={st.planPricePer}>/mo</Text></Text>
              <Text style={[st.planPriceAlt, plan === 'monthly' && st.planPriceAltActive]}>Cancel anytime</Text>
            </Pressable>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [st.ctaBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
            onPress={() => onSubscribe(plan)}
          >
            <LinearGradient
              colors={['#6C5CE7', '#5B4CC8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.ctaGradient}
            >
              <Text style={st.ctaText}>{plan === 'yearly' ? 'Try for free' : 'Continue'}</Text>
            </LinearGradient>
          </Pressable>

          {/* Reassurance */}
          <View style={st.reassuranceRow}>
            <Ionicons name="checkmark-circle" size={14} color="#00B894" />
            <Text style={st.reassuranceText}>
              {plan === 'yearly' ? 'No payment now \u00B7 Cancel anytime' : `${monthlyPrice} billed monthly \u00B7 Cancel anytime`}
            </Text>
          </View>

          {/* Legal links */}
          <View style={st.legalRow}>
            <Pressable><Text style={st.legalLink}>Terms of Use</Text></Pressable>
            <Text style={st.legalDivider}>|</Text>
            <Pressable><Text style={st.legalLink}>Privacy Policy</Text></Pressable>
            <Text style={st.legalDivider}>|</Text>
            <Pressable onPress={handleDismiss}><Text style={st.legalLink}>Restore</Text></Pressable>
          </View>
        </View>
      </RNAnimated.View>
    </Modal>
  );
}

export default SubscriptionPaywall;

const ACCENT = '#6C5CE7';
const st = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Top ──
  topSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  restoreTopBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 20,
    right: 16,
    zIndex: 10,
  },
  restoreTopText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  heroArea: { alignItems: 'center', marginTop: 48, marginBottom: 24 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginTop: 16,
    letterSpacing: -0.3,
  },

  benefitsList: { gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitDot: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  benefitBold: { fontWeight: '800', color: '#FFFFFF' },

  deco: { position: 'absolute' },

  // ── Bottom ──
  bottomSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  planRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E6E3',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FAFAF8',
  },
  planCardActive: {
    borderColor: ACCENT,
    borderWidth: 2,
    backgroundColor: ACCENT + '08',
  },
  bestOfferBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestOfferText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.8 },

  planRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D0CEC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  planRadioActive: { borderColor: ACCENT },
  planRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ACCENT },

  planLabel: { fontSize: 15, fontWeight: '800', color: '#636E72', marginBottom: 2 },
  planLabelActive: { color: '#1A1A18' },
  planSub: { fontSize: 11, color: '#B2BEC3', fontWeight: '500', marginBottom: 8 },
  planSubActive: { color: '#636E72' },
  planDivider: { width: '70%', height: 1, backgroundColor: '#E8E6E3', marginBottom: 8 },
  planPriceMain: { fontSize: 18, fontWeight: '900', color: '#B2BEC3' },
  planPriceActive: { color: '#1A1A18' },
  planPricePer: { fontSize: 12, fontWeight: '500' },
  planPriceAlt: { fontSize: 10, color: '#B2BEC3', fontWeight: '500', marginTop: 2 },
  planPriceAltActive: { color: '#636E72' },

  // CTA
  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  ctaGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: 16,
  },
  ctaText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },

  reassuranceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 12 },
  reassuranceText: { fontSize: 12, color: '#636E72', fontWeight: '500' },

  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 11, color: '#B2BEC3', fontWeight: '500' },
  legalDivider: { fontSize: 11, color: '#D0CEC8' },
});
