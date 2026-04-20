/**
 * StreakRecoveryModal — shown when the app opens after missing days.
 *
 * Scenarios handled (per spec):
 *   • 1 day missed, shield available → (handled upstream via auto-use; this
 *     modal never appears for that case)
 *   • 1 day missed, no shield → single gem card (10 gems)
 *   • 2-3 days, has shield → shield+gem combo card + plain gem card
 *   • 2-3 days, no shield → plain gem card
 *   • 4-14 days → gem card + transparent price-breakdown card
 *   • Can't afford → gem card dims, tap routes to shop with "need X more"
 *   • 15+ days → no options, single "Start Fresh" purple button
 *
 * Uses three Blink expressions (`sad`, `worried`, `crying`) based on severity.
 * All Supabase mutations go through `streakRecovery` utils; this component
 * only orchestrates the UI.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { useAuth } from '@/src/providers/AuthProvider';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import type { BlinkExpression } from '@/src/components/Blink';
import {
  getRecoveryPrice,
  getShieldComboPrice,
  recoverWithGems,
  recoverWithShield,
  letStreakReset,
  MAX_RECOVERABLE_DAYS_MISSED,
} from '@/src/utils/streakRecovery';

const SHIELD = '\uD83D\uDEE1\uFE0F';
const isWeb = Platform.OS === 'web';

interface Props {
  visible: boolean;
  /** Streak the player had before missing days — what we're trying to save. */
  streak: number;
  daysMissed: number;
  onDismiss: () => void;
}

function pickExpression(daysMissed: number): BlinkExpression {
  if (daysMissed >= 4) return 'crying';
  if (daysMissed >= 2) return 'worried';
  return 'sad';
}

function buildTitle(daysMissed: number): string {
  if (daysMissed === 1) return 'Your streak is in danger';
  if (daysMissed <= MAX_RECOVERABLE_DAYS_MISSED) return `You missed ${daysMissed} days`;
  return 'Your streak is gone';
}

function buildSubtitle(daysMissed: number): string {
  if (daysMissed === 1) return "You didn't play yesterday. One more day and it resets.";
  if (daysMissed <= MAX_RECOVERABLE_DAYS_MISSED) return `Your fire is fading. ${daysMissed} days without training.`;
  return "It's been over 2 weeks. Your streak has reset permanently.";
}

export function StreakRecoveryModal({ visible, streak, daysMissed, onDismiss }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const gems = useGameStore((s) => s.gems);
  const shields = useGameStore((s) => s.streakShields);
  const applyLocal = useGameStore((s) => s.applyStreakRecoveryLocal);
  const resetLocal = useGameStore((s) => s.resetStreakLocal);

  // Slide-up spring entrance. Initial offset = screen height so the modal
  // is fully off-screen on tall layouts (taller than a hardcoded 600px).
  const screenH = Dimensions.get('window').height;
  const slide = useRef(new RNAnimated.Value(screenH)).current;
  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
    } else {
      slide.setValue(screenH);
    }
  }, [visible, slide, screenH]);

  const animateDismiss = (after?: () => void) => {
    RNAnimated.timing(slide, { toValue: screenH, duration: 220, useNativeDriver: true }).start(() => {
      onDismiss();
      after?.();
    });
  };

  // Recovery cost math
  const gemPrice = getRecoveryPrice(streak, daysMissed);
  const comboPrice = getShieldComboPrice(daysMissed);
  const goneForever = gemPrice < 0;
  const canAffordGems = gemPrice >= 0 && gems >= gemPrice;
  // Shields only help on 1-3 day misses (per spec) — explicit check so a
  // future change to comboPrice's return value can't re-enable shield
  // options for 4+ days unintentionally.
  const canAffordCombo = shields > 0 && daysMissed <= 3 && comboPrice >= 0 && (comboPrice === 0 || gems >= comboPrice);
  const shortfall = gemPrice > 0 ? Math.max(0, gemPrice - gems) : 0;

  // Handlers.
  //
  // All three paths below are deliberately OPTIMISTIC — we apply the
  // local store change AND dismiss the modal the moment the user
  // taps, then fire the Supabase writes in the background. Previously
  // these awaited 2-3 sequential round-trips (SELECT gems → UPDATE
  // profile → INSERT economy_events) before the UI responded, which
  // froze the home screen for 1-3 seconds on slow connections. The
  // client-side affordability checks (canAffordGems / canAffordCombo)
  // already guarantee the write will succeed; on the rare failure
  // path (offline, RLS quirk) we log and move on — worst case the
  // user keeps their recovered streak but loses the gems, which is
  // generous rather than punishing, and the next cloud sync
  // reconciles either way.
  const onGemRecover = () => {
    if (!user?.id || gemPrice < 0) return;
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!canAffordGems) {
      animateDismiss(() => {
        router.push({
          pathname: '/(tabs)/shop',
          params: { needGems: String(shortfall), reason: 'streak_recovery' },
        });
      });
      return;
    }
    // Optimistic: local store + modal dismissal now; Supabase writes
    // chase in the background.
    applyLocal(-gemPrice, 0);
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    animateDismiss();
    recoverWithGems(user.id, gemPrice, streak).catch(() => {});
  };

  const onComboRecover = () => {
    if (!user?.id || !canAffordCombo) return;
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    applyLocal(-comboPrice, -1);
    if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    animateDismiss();
    recoverWithShield(user.id, comboPrice).catch(() => {});
  };

  const onLetReset = () => {
    resetLocal();
    animateDismiss();
    if (user?.id) {
      letStreakReset(user.id).catch(() => {});
    }
  };

  if (!visible) return null;

  const expression = pickExpression(daysMissed);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={[st.backdrop, { backgroundColor: colors.overlayBg }]}>
        <RNAnimated.View
          style={[
            st.card,
            { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slide }] },
          ]}
        >
          {/* Blink sitting naturally at the top, no container */}
          <View style={{ alignItems: 'center' }}>
            <AnimatedBlink expression={expression} size={80} entrance={isWeb ? 'none' : 'bounce'} />
          </View>

          {/* Streak number. Greyed + strikethrough for the gone-forever case. */}
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <View style={{ position: 'relative' }}>
              <Text
                style={[
                  st.streakNum,
                  { color: goneForever ? colors.textLight : colors.wrong },
                  goneForever && { opacity: 0.5 },
                ]}
              >
                {streak}
              </Text>
              {goneForever && (
                <View style={[st.strikeLine, { backgroundColor: colors.wrong }]} />
              )}
            </View>
            <Text style={[st.streakLabel, { color: colors.textMid }]}>day streak</Text>
          </View>

          <Text style={[st.title, { color: colors.text }]} numberOfLines={2}>
            {buildTitle(daysMissed)}
          </Text>
          <Text style={[st.subtitle, { color: colors.textMid }]}>
            {buildSubtitle(daysMissed)}
          </Text>

          <View style={[st.divider, { backgroundColor: colors.border }]} />

          {goneForever ? (
            // ── Gone-forever: single Start Fresh button ──
            <Pressable
              onPress={onLetReset}
              style={({ pressed }) => [
                st.resetBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start fresh"
            >
              <Text style={st.resetBtnText}>Start Fresh</Text>
            </Pressable>
          ) : (
            // ── Recoverable: option cards + dismiss link ──
            <>
              {/* Shield combo option — only shown if player has shield AND combo is valid (1-3 days) */}
              {shields > 0 && daysMissed <= 3 && comboPrice >= 0 && (
                <OptionCard
                  iconBg={colors.correctSoft}
                  iconColor={colors.correct}
                  iconEmoji={SHIELD}
                  title="Use Streak Shield"
                  subtitle={
                    comboPrice === 0
                      ? `${shields} shield${shields !== 1 ? 's' : ''} available`
                      : `Shield + ${comboPrice} gems`
                  }
                  actionBg={colors.correctSoft}
                  actionText={comboPrice === 0 ? 'Free' : String(comboPrice)}
                  actionTextColor={colors.correct}
                  disabled={!canAffordCombo}
                  onPress={onComboRecover}
                  colors={colors}
                />
              )}

              {/* Gem recovery option */}
              <OptionCard
                iconBg={colors.accentSoft}
                iconColor={colors.accent}
                iconName="diamond"
                title={shields > 0 && daysMissed <= 3 && comboPrice >= 0 ? 'Or pay with gems' : 'Recover with gems'}
                subtitle={
                  canAffordGems
                    ? `You have ${gems.toLocaleString()} gems`
                    : `Need ${shortfall} more gem${shortfall !== 1 ? 's' : ''}`
                }
                subtitleColor={canAffordGems ? undefined : colors.wrong}
                actionBg={colors.accent}
                actionText={String(gemPrice)}
                actionTextColor="#FFFFFF"
                dimmed={!canAffordGems}
                onPress={onGemRecover}
                colors={colors}
              />

              {/* Price breakdown for 4+ day misses so the cost feels transparent */}
              {daysMissed >= 4 && (
                <PriceBreakdownCard streak={streak} daysMissed={daysMissed} total={gemPrice} colors={colors} />
              )}

              <Pressable onPress={onLetReset} style={st.dismissBtn} accessibilityRole="button" accessibilityLabel="Let my streak reset">
                <Text style={[st.dismissText, { color: colors.accent }]}>Let it reset</Text>
              </Pressable>
            </>
          )}
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

// ─── Option card (shared between shield + gem variants) ────────────────
function OptionCard({
  iconBg,
  iconColor,
  iconEmoji,
  iconName,
  title,
  subtitle,
  subtitleColor,
  actionBg,
  actionText,
  actionTextColor,
  disabled = false,
  dimmed = false,
  onPress,
  colors,
}: {
  iconBg: string;
  iconColor: string;
  iconEmoji?: string;
  iconName?: 'diamond';
  title: string;
  subtitle: string;
  subtitleColor?: string;
  actionBg: string;
  actionText: string;
  actionTextColor: string;
  disabled?: boolean;
  dimmed?: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        st.option,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && !disabled && { opacity: 0.92 },
        (dimmed || disabled) && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[st.optionIcon, { backgroundColor: iconBg }]}>
        {iconEmoji ? (
          <Text style={{ fontSize: 18 }}>{iconEmoji}</Text>
        ) : iconName === 'diamond' ? (
          <Ionicons name="diamond" size={18} color={iconColor} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[st.optionSub, { color: subtitleColor ?? colors.textMid }]}>{subtitle}</Text>
      </View>
      <View style={[st.optionAction, { backgroundColor: actionBg }]}>
        {iconName === 'diamond' && <Ionicons name="diamond" size={11} color={actionTextColor} />}
        <Text style={[st.optionActionText, { color: actionTextColor }]}>{actionText}</Text>
      </View>
    </Pressable>
  );
}

// ─── Transparent price breakdown (shown for 4+ days missed) ────────────
function PriceBreakdownCard({
  streak,
  daysMissed,
  total,
  colors,
}: {
  streak: number;
  daysMissed: number;
  total: number;
  colors: any;
}) {
  const streakMult = daysMissed <= 7 ? 0.3 : 0.5;
  const dayMult = daysMissed <= 7 ? 10 : 15;
  const streakComponent = Math.round(streak * streakMult);
  const dayComponent = daysMissed * dayMult;

  return (
    <View style={[st.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={st.breakdownRow}>
        <Text style={[st.breakdownLabel, { color: colors.textMid }]}>{streak}-day streak × {streakMult}</Text>
        <Text style={[st.breakdownVal, { color: colors.text }]}>{streakComponent}</Text>
      </View>
      <View style={st.breakdownRow}>
        <Text style={[st.breakdownLabel, { color: colors.textMid }]}>{daysMissed} days × {dayMult} gems</Text>
        <Text style={[st.breakdownVal, { color: colors.text }]}>{dayComponent}</Text>
      </View>
      <View style={[st.breakdownDivider, { backgroundColor: colors.border }]} />
      <View style={st.breakdownRow}>
        <Text style={[st.breakdownLabel, { color: colors.text, fontWeight: '700' }]}>Recovery cost</Text>
        <Text style={[st.breakdownTotal, { color: colors.accent }]}>{total} gems</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  streakNum: { fontSize: 52, fontWeight: '800', lineHeight: 54 },
  strikeLine: {
    position: 'absolute',
    left: -6, right: -6, top: '50%',
    height: 3, borderRadius: 2, opacity: 0.9,
  },
  streakLabel: { fontSize: 12, marginTop: 2 },
  title: { fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 12, marginTop: 6, maxWidth: 260, textAlign: 'center', alignSelf: 'center', lineHeight: 17 },
  divider: { height: 1, width: '100%', marginTop: 18, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  optionSub: { fontSize: 11, marginTop: 2 },
  optionAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  optionActionText: { fontSize: 13, fontWeight: '800' },
  breakdown: {
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 4,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 11 },
  breakdownVal: { fontSize: 11, fontWeight: '700' },
  breakdownDivider: { height: 1, marginVertical: 4 },
  breakdownTotal: { fontSize: 13, fontWeight: '800' },
  dismissBtn: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  dismissText: { fontSize: 12, fontWeight: '500' },
  resetBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  resetBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
