/**
 * Blanked+ Subscription Paywall — Beautiful, high-converting full-screen paywall.
 * Displays benefits, pricing toggle (monthly/yearly), and purchase CTA.
 * Designed to feel premium, not pushy.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  Dimensions, Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/providers/ThemeProvider';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

interface Benefit {
  icon: string;
  ionicon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  color: string;
}

const BENEFITS: Benefit[] = [
  { icon: '\u{2764}\uFE0F', ionicon: 'heart', title: 'Unlimited lives', description: 'Never wait for lives to refill again', color: '#FF6B6B' },
  { icon: '\u{1F48E}', ionicon: 'diamond', title: '100 gems per month', description: 'Free gems deposited every 30 days', color: '#6C5CE7' },
  { icon: '\u{26A1}', ionicon: 'flash', title: '1 free power-up daily', description: 'A random power-up every day', color: '#F9CA24' },
  { icon: '\u{1F6AB}', ionicon: 'eye-off', title: 'No ads', description: 'No interstitials, no banners, ever', color: '#0984E3' },
  { icon: '\u{1F4CA}', ionicon: 'stats-chart', title: 'Memory analytics', description: 'Track your progress over time', color: '#00B894' },
  { icon: '\u{1F451}', ionicon: 'star', title: 'Subscriber badge', description: 'Show off your Blanked+ status', color: '#D4A012' },
];

function SubscriptionPaywall({ visible, onDismiss, onSubscribe }: Props) {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible]);

  if (!visible) return null;

  const monthlyPrice = '\u00A32.99';
  const yearlyPrice = '\u00A324.99';
  const yearlyMonthly = '\u00A32.08';
  const savingsPercent = '30%';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <View style={st.backdrop}>
        <RNAnimated.View style={[st.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Header gradient */}
          <LinearGradient
            colors={['#6C5CE7', '#5B4CC8', '#4A3DB5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.header}
          >
            {/* Close button */}
            <Pressable style={st.closeBtn} onPress={onDismiss}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </Pressable>

            {/* Logo */}
            <View style={st.logoRow}>
              <View style={st.logoBg}>
                <Ionicons name="eye" size={20} color="#6C5CE7" />
              </View>
            </View>

            <Text style={st.headerTitle}>Blanked<Text style={{ fontWeight: '900' }}>+</Text></Text>
            <Text style={st.headerSubtitle}>Unlock the full experience</Text>

            {/* Sparkle dots */}
            <View style={[st.sparkle, { top: 24, left: 30 }]}><Text style={{ fontSize: 8 }}>{'\u2728'}</Text></View>
            <View style={[st.sparkle, { top: 45, right: 40 }]}><Text style={{ fontSize: 10 }}>{'\u2728'}</Text></View>
            <View style={[st.sparkle, { bottom: 30, left: 50 }]}><Text style={{ fontSize: 6 }}>{'\u2728'}</Text></View>
          </LinearGradient>

          {/* Benefits list */}
          <ScrollView
            style={[st.benefitsScroll, { backgroundColor: colors.bg }]}
            contentContainerStyle={st.benefitsContent}
            showsVerticalScrollIndicator={false}
          >
            {BENEFITS.map((b, i) => (
              <View key={i} style={[st.benefitRow, { borderBottomColor: colors.border }]}>
                <View style={[st.benefitIconBg, { backgroundColor: b.color + '12' }]}>
                  <Ionicons name={b.ionicon} size={18} color={b.color} />
                </View>
                <View style={st.benefitText}>
                  <Text style={[st.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                  <Text style={[st.benefitDesc, { color: colors.textMid }]}>{b.description}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.correct} />
              </View>
            ))}

            {/* Plan toggle */}
            <View style={st.planSection}>
              <Text style={[st.planSectionTitle, { color: colors.text }]}>Choose your plan</Text>

              {/* Yearly plan */}
              <Pressable
                style={[st.planCard, {
                  backgroundColor: plan === 'yearly' ? colors.accentSoft : colors.card,
                  borderColor: plan === 'yearly' ? colors.accent : colors.border,
                  borderWidth: plan === 'yearly' ? 2 : 1,
                }]}
                onPress={() => setPlan('yearly')}
              >
                <View style={st.planCardLeft}>
                  <View style={[st.radioOuter, { borderColor: plan === 'yearly' ? colors.accent : colors.textLight }]}>
                    {plan === 'yearly' && <View style={[st.radioInner, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View>
                    <View style={st.planTitleRow}>
                      <Text style={[st.planTitle, { color: colors.text }]}>Yearly</Text>
                      <View style={[st.saveBadge, { backgroundColor: colors.correct }]}>
                        <Text style={st.saveBadgeText}>SAVE {savingsPercent}</Text>
                      </View>
                    </View>
                    <Text style={[st.planPrice, { color: colors.textMid }]}>
                      {yearlyPrice}/year ({yearlyMonthly}/mo)
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Monthly plan */}
              <Pressable
                style={[st.planCard, {
                  backgroundColor: plan === 'monthly' ? colors.accentSoft : colors.card,
                  borderColor: plan === 'monthly' ? colors.accent : colors.border,
                  borderWidth: plan === 'monthly' ? 2 : 1,
                }]}
                onPress={() => setPlan('monthly')}
              >
                <View style={st.planCardLeft}>
                  <View style={[st.radioOuter, { borderColor: plan === 'monthly' ? colors.accent : colors.textLight }]}>
                    {plan === 'monthly' && <View style={[st.radioInner, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View>
                    <Text style={[st.planTitle, { color: colors.text }]}>Monthly</Text>
                    <Text style={[st.planPrice, { color: colors.textMid }]}>{monthlyPrice}/month</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [st.ctaBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              onPress={() => onSubscribe(plan)}
            >
              <LinearGradient
                colors={['#6C5CE7', '#5B4CC8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.ctaGradient}
              >
                <Text style={st.ctaText}>
                  Start free trial
                </Text>
                <Text style={st.ctaSubtext}>
                  7 days free, then {plan === 'yearly' ? yearlyPrice + '/year' : monthlyPrice + '/month'}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Legal */}
            <Text style={[st.legalText, { color: colors.textLight }]}>
              Cancel anytime. Payment charged through your App Store account. Subscription auto-renews unless cancelled 24 hours before the end of the current period.
            </Text>

            {/* Restore */}
            <Pressable style={st.restoreBtn} onPress={onDismiss}>
              <Text style={[st.restoreText, { color: colors.textMid }]}>Restore purchase</Text>
            </Pressable>
          </ScrollView>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default SubscriptionPaywall;

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoRow: { marginBottom: 12 },
  logoBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  sparkle: { position: 'absolute' },

  // Benefits
  benefitsScroll: { flex: 1 },
  benefitsContent: { padding: 20, paddingBottom: 40 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  benefitIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700' },
  benefitDesc: { fontSize: 12, marginTop: 1 },

  // Plans
  planSection: { marginTop: 20, marginBottom: 16 },
  planSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  planCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  planCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 15, fontWeight: '700' },
  planPrice: { fontSize: 12, marginTop: 2 },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  // CTA
  ctaBtn: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  ctaText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  ctaSubtext: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Legal
  legalText: { fontSize: 10, textAlign: 'center', lineHeight: 15, marginBottom: 12 },
  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreText: { fontSize: 13, fontWeight: '600' },
});
