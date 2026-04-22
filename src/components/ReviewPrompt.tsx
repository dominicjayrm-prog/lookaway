/**
 * ReviewPrompt — Stage A of the "Rate BLANKED" flow.
 *
 * A BLANKED-branded modal with Blink poking out the top. Shown at
 * peak-joy moments (3-star level complete, streak milestone, friend
 * challenge win). Only if the user taps "Sure, I'd love to" do we
 * escalate to Apple's native rating sheet — preserves Apple's
 * 3-prompts-per-365-days quota for users who actually want to rate.
 *
 * Visually modeled on PremiumCelebration but calmer: 700ms spring-in,
 * card-based, mid-screen — not cinematic. A 3px gold top-border +
 * Blink-with-white-ring act as the premium accent without shouting.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  Animated as RNAnimated, Dimensions, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Blink } from '@/src/components/Blink';
import { useGameStore } from '@/src/store/gameStore';
import { haptics } from '@/src/lib/haptics';
import { sounds } from '@/src/lib/sounds';
import { track, EVENTS } from '@/src/lib/analytics';
import { triggerNativeStoreReview } from '@/src/lib/reviewPrompt';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = Math.min(340, SW - 48);

// Palette pulled from CLAUDE.md. Hardcoded light-mode for v1 — the
// gold top-border reads well in dark too, but themeing this modal is
// a follow-up once useTheme() is more widely adopted in the codebase.
const ACCENT = '#6C5CE7';
const GOLD = '#D4A012';
const CARD_BG = '#FFFFFF';
const TEXT = '#1A1A18';
const TEXT_MID = '#636E72';

function ReviewPromptComponent() {
  const visible = useGameStore((s) => s.reviewPromptVisible);
  const trigger = useGameStore((s) => s.reviewPromptTrigger);
  const setVisible = useGameStore((s) => s.setReviewPromptVisible);
  const recordOutcome = useGameStore((s) => s.recordReviewPrompted);

  // Animation refs — backdrop, card slide/fade, Blink pop.
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardTranslate = useRef(new RNAnimated.Value(40)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const blinkScale = useRef(new RNAnimated.Value(0)).current;

  // Double-tap guard. The "Sure" button fires native StoreReview,
  // a state write AND an analytics event — a second tap during the
  // close animation would fire all of those again. This ref flips
  // true on the first tap and blocks subsequent taps until the next
  // open cycle.
  const responded = useRef(false);

  useEffect(() => {
    if (!visible) return;
    // Reset the guard on each fresh open.
    responded.current = false;

    // Reset to start positions (modal reused across multiple opens).
    backdropOpacity.setValue(0);
    cardTranslate.setValue(40);
    cardOpacity.setValue(0);
    blinkScale.setValue(0);

    // 0–220ms: backdrop fade.
    RNAnimated.timing(backdropOpacity, {
      toValue: 1, duration: 220, useNativeDriver: true,
    }).start();
    // 120ms-ish: card slides up + fades in.
    RNAnimated.parallel([
      RNAnimated.spring(cardTranslate, {
        toValue: 0, friction: 7, tension: 120, useNativeDriver: true,
      }),
      RNAnimated.timing(cardOpacity, {
        toValue: 1, duration: 220, delay: 60, useNativeDriver: true,
      }),
    ]).start();
    // 280ms: Blink pops (matches PremiumCelebration's friction/tension).
    RNAnimated.spring(blinkScale, {
      toValue: 1, friction: 3, tension: 180, delay: 280, useNativeDriver: true,
    }).start();
    // 400ms: gentle haptic tick as Blink lands.
    const tick = setTimeout(() => haptics.impact(Haptics.ImpactFeedbackStyle.Light), 400);
    return () => clearTimeout(tick);
  }, [visible, backdropOpacity, cardTranslate, cardOpacity, blinkScale]);

  function closeWithAnimation(after?: () => void) {
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      RNAnimated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      RNAnimated.timing(cardTranslate, { toValue: 30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      after?.();
    });
  }

  function handleAccept() {
    if (responded.current) return;
    responded.current = true;
    haptics.notify(Haptics.NotificationFeedbackType.Success);
    sounds.play('celebration');
    recordOutcome('accepted');
    track(EVENTS.REVIEW_PROMPT_ACCEPTED, { trigger: trigger ?? 'unknown' });
    // Let the close animation finish, then fire Apple's native sheet.
    // The 250ms gap prevents Apple's sheet from sliding up OVER our
    // modal — it looks jankier than waiting.
    closeWithAnimation(() => {
      setTimeout(() => { triggerNativeStoreReview(); }, 250);
    });
  }

  function handleDismiss() {
    if (responded.current) return;
    responded.current = true;
    haptics.selection();
    recordOutcome('dismissed');
    track(EVENTS.REVIEW_PROMPT_DISMISSED, { trigger: trigger ?? 'unknown' });
    closeWithAnimation();
  }

  if (!visible) return null;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none">
      {/* Non-tappable backdrop — we want an explicit choice. Tapping
          through would count as dismiss and burn the 60-day cooldown
          for nothing. */}
      <RNAnimated.View style={[st.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto" />
      <View style={st.center} pointerEvents="box-none">
        <RNAnimated.View
          style={[
            st.card,
            { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] },
          ]}
        >
          {/* Blink pokes out the top, sitting over the gold border like
              a badge. The white ring separates his silhouette cleanly
              from the 3px gold line underneath. */}
          <View style={st.blinkWrap}>
            <RNAnimated.View style={[st.blinkRing, { transform: [{ scale: blinkScale }] }]}>
              <Blink expression="love" size={84} />
            </RNAnimated.View>
          </View>

          <Text style={st.title}>Enjoying BLANKED?</Text>
          <Text style={st.body}>
            If you're having fun, a quick rating on the App Store helps
            new players discover the game. Thank you!
          </Text>

          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Sure, I'd love to rate Blanked"
          >
            <Text style={st.primaryText}>Sure, I'd love to</Text>
          </Pressable>

          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
          >
            <Text style={st.secondaryText}>Maybe later</Text>
          </Pressable>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export const ReviewPrompt = React.memo(ReviewPromptComponent);

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderTopWidth: 3,
    borderTopColor: GOLD,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 20,
    alignItems: 'center',
    // Soft shadow so the card lifts off the backdrop on both light
    // and dark systems.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  blinkWrap: {
    position: 'absolute',
    top: -52,
    left: 0, right: 0,
    alignItems: 'center',
  },
  blinkRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: CARD_BG,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_MID,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 4 : 0,
    marginBottom: 8,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_MID,
  },
});
