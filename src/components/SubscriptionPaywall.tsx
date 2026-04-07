/**
 * Blanked+ Subscription Paywall — Full-screen modal.
 * Free trial toggle, stacked plan cards, shimmer CTA, staggered animations.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  Dimensions, Animated as RNAnimated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const ACCENT = '#6C5CE7';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly', trial: boolean) => void;
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

// ── Benefits data ─────────────────────────────────────────────────────
const BENEFITS = [
  { Icon: HeartSvg, color: '#FF6B6B', title: 'Unlimited lives', desc: 'Never wait to play again' },
  { Icon: GemSvg, color: ACCENT, title: '100 gems every month', desc: 'Deposited on renewal day' },
  { Icon: StarSvg, color: '#D4A012', title: 'Free daily power-up', desc: 'Random boost every 24 hours' },
  { Icon: NoAdsSvg, color: '#0984E3', title: 'No ads', desc: 'Clean, uninterrupted play' },
];

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
function BenefitRow({ item, index }: { item: typeof BENEFITS[number]; index: number }) {
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
    <RNAnimated.View style={[st.benefitRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[st.benefitIcon, { backgroundColor: item.color + '12' }]}>
        <item.Icon />
      </View>
      <View style={st.benefitText}>
        <Text style={st.benefitTitle}>{item.title}</Text>
        <Text style={st.benefitDesc}>{item.desc}</Text>
      </View>
      <RNAnimated.View style={{ transform: [{ scale: checkScale }] }}>
        <Ionicons name="checkmark-circle" size={18} color="#00B894" />
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

// ── Free Trial Toggle ─────────────────────────────────────────────────
function TrialToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const thumbPos = useRef(new RNAnimated.Value(enabled ? 1 : 0)).current;
  useEffect(() => {
    RNAnimated.spring(thumbPos, { toValue: enabled ? 1 : 0, friction: 7, tension: 200, useNativeDriver: false }).start();
  }, [enabled]);
  const thumbTranslate = thumbPos.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackColor = thumbPos.interpolate({ inputRange: [0, 1], outputRange: ['#D0CEC8', '#00B894'] });

  return (
    <Pressable onPress={onToggle} style={[st.trialRow, { backgroundColor: enabled ? '#00B89410' : '#F7F6F3' }]}>
      <View style={{ flex: 1 }}>
        <Text style={[st.trialTitle, { color: '#1A1A18' }]}>Free trial</Text>
        <Text style={[st.trialSub, { color: enabled ? '#00B894' : '#636E72' }]}>
          {enabled ? `Try 3 days free \u2014 cancel before, pay nothing` : 'Toggle to enable 3-day free trial'}
        </Text>
      </View>
      <View style={st.toggleOuter}>
        <RNAnimated.View style={[st.toggleTrack, { backgroundColor: trackColor }]} />
        <RNAnimated.View style={[st.toggleThumb, { transform: [{ translateX: thumbTranslate }] }]} />
      </View>
    </Pressable>
  );
}

// ── Main Component ────────────────────────────────────────────────────
function SubscriptionPaywall({ visible, onDismiss, onSubscribe }: Props) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [trial, setTrial] = useState(true);
  const slideAnim = useRef(new RNAnimated.Value(SH)).current;

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
    } else {
      slideAnim.setValue(SH);
    }
  }, [visible]);

  function handleDismiss() {
    RNAnimated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  }

  if (!visible) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] });
  const ctaText = trial && plan === 'yearly' ? 'Start Free Trial' : plan === 'yearly' ? `Subscribe \u2014 \u00A319.99/year` : `Subscribe \u2014 \u00A32.99/month`;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={st.webCenter}>
      <RNAnimated.View style={[st.fullScreen, { transform: [{ translateY: slideAnim }] }]}>
        {/* Purple gradient header */}
        <LinearGradient
          colors={['#6C5CE7', '#A29BFE', '#4A3BBF']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[st.header, { paddingTop: Math.max(insets.top + 8, 24) }]}
        >
          <Pressable style={st.restoreBtn} onPress={handleDismiss} hitSlop={12}>
            <Text style={st.restoreText}>Restore</Text>
          </Pressable>
          <Pressable style={st.closeBtn} onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>

          {/* Logo */}
          <View style={st.logoCircle}>
            <EyeLogoSvg />
          </View>
          <Text style={st.headerTitle}>Blanked<Text style={{ fontWeight: '400', opacity: 0.75 }}>+</Text></Text>
          <Text style={st.headerSub}>Train your memory without limits</Text>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={st.content} contentContainerStyle={[st.contentInner, { paddingBottom: Math.max(insets.bottom + 12, 28) }]} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Benefits */}
          {BENEFITS.map((b, i) => <BenefitRow key={i} item={b} index={i} />)}

          {/* Trial toggle — only for yearly */}
          {plan === 'yearly' && (
            <TrialToggle enabled={trial} onToggle={() => setTrial(!trial)} />
          )}

          {/* Plan cards — stacked */}
          <View style={st.planSection}>
            {/* Yearly */}
            <Pressable onPress={() => { setPlan('yearly'); }} style={[st.planCard, plan === 'yearly' && st.planCardActive]}>
              {plan === 'yearly' && <RNAnimated.View style={[st.planGlow, { opacity: glowOpacity }]} />}
              <View style={[st.planRadio, plan === 'yearly' && st.planRadioActive]}>
                {plan === 'yearly' && <View style={st.planRadioDot} />}
              </View>
              <View style={st.planLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[st.planName, plan === 'yearly' && st.planNameActive]}>Yearly</Text>
                  <View style={st.bestValueBadge}><Text style={st.bestValueText}>BEST VALUE</Text></View>
                </View>
                <Text style={[st.planSub, plan === 'yearly' && st.planSubActive]}>{'\u00A3'}1.66/month</Text>
              </View>
              <Text style={[st.planPrice, plan === 'yearly' && st.planPriceActive]}>{'\u00A3'}19.99<Text style={st.planPricePer}>/year</Text></Text>
            </Pressable>

            {/* Monthly */}
            <Pressable onPress={() => { setPlan('monthly'); setTrial(false); }} style={[st.planCard, plan === 'monthly' && st.planCardActive]}>
              {plan === 'monthly' && <RNAnimated.View style={[st.planGlow, { opacity: glowOpacity }]} />}
              <View style={[st.planRadio, plan === 'monthly' && st.planRadioActive]}>
                {plan === 'monthly' && <View style={st.planRadioDot} />}
              </View>
              <View style={st.planLeft}>
                <Text style={[st.planName, plan === 'monthly' && st.planNameActive]}>Monthly</Text>
              </View>
              <Text style={[st.planPrice, plan === 'monthly' && st.planPriceActive]}>{'\u00A3'}2.99<Text style={st.planPricePer}>/month</Text></Text>
            </Pressable>
          </View>

          {/* Shimmer CTA */}
          <ShimmerButton text={ctaText} onPress={() => onSubscribe(plan, trial)} />

          {/* Reassurance */}
          <View style={st.reassurance}>
            {trial && plan === 'yearly' ? (
              <View style={st.reassuranceRow}>
                <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                <Text style={st.reassuranceGreen}>{`No charge for 3 days \u2014 cancel anytime`}</Text>
              </View>
            ) : (
              <Text style={st.reassuranceGrey}>Cancel anytime in Settings</Text>
            )}
          </View>

          {/* Legal */}
          <View style={st.legalRow}>
            <Pressable><Text style={st.legalLink}>Terms</Text></Pressable>
            <Text style={st.legalDot}>{'\u00B7'}</Text>
            <Pressable><Text style={st.legalLink}>Privacy</Text></Pressable>
            <Text style={st.legalDot}>{'\u00B7'}</Text>
            <Pressable onPress={handleDismiss}><Text style={st.legalLink}>Restore</Text></Pressable>
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
  header: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', position: 'relative' },
  restoreBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 16, left: 16, zIndex: 10 },
  restoreText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 14, right: 16, zIndex: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 54, height: 54, borderRadius: 27, marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Content
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  contentInner: { paddingHorizontal: 20, paddingTop: 16 },

  // Benefits
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  benefitIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A18' },
  benefitDesc: { fontSize: 11, color: '#636E72', marginTop: 1 },

  // Trial toggle
  trialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14,
    marginTop: 14, marginBottom: 14,
  },
  trialTitle: { fontSize: 14, fontWeight: '700' },
  trialSub: { fontSize: 11, marginTop: 2 },
  toggleOuter: { width: 48, height: 28, position: 'relative' },
  toggleTrack: { position: 'absolute', width: 48, height: 28, borderRadius: 14 },
  toggleThumb: {
    position: 'absolute', top: 2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },

  // Plans
  planSection: { gap: 8, marginBottom: 16 },
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
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 4 },
  legalLink: { fontSize: 10, color: '#B2BEC3' },
  legalDot: { fontSize: 10, color: '#D0CEC8' },
});
