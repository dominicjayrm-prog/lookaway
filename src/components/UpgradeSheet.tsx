/**
 * UpgradeSheet — contextual "save your account" prompt for guests.
 *
 * Surfaced when a guest tries to do something that requires a real
 * account (friend request, claim leaderboard rank, etc.). The sheet is
 * a soft prompt, never a wall: there's always a "Not now" exit that
 * dismisses without consequence.
 *
 * Three reasons to use this rather than redirecting straight to
 * /save-account:
 *
 *   1. Context is preserved. The user came here to add a friend or
 *      claim a rank — the sheet shows them WHY they're being asked,
 *      and the screen they were on stays underneath. Routing them
 *      away would lose the moment.
 *
 *   2. The "what you're saving" preview lives here too. The CTA
 *      converts harder when the player sees their own progress
 *      seconds before tapping save.
 *
 *   3. Dismissal stays visually local — sheet slides down, user is
 *      back on the friends tab. Routing-then-back-button is
 *      heavier and breaks navigation history.
 *
 * Usage:
 *
 *   <UpgradeSheet
 *     visible={showUpgrade}
 *     reason="friend_request"
 *     onClose={() => setShowUpgrade(false)}
 *   />
 *
 * `reason` drives the title + body copy via i18n keys
 * `upgrade_sheet.reason.<reason>.{title,body}`. Add a new reason by
 * adding the two keys to EN + ES and extending the UpgradeReason
 * union type below.
 */
import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { t } from '@/src/i18n';
import { track } from '@/src/lib/analytics';

/** Why the user is being asked to save their account. Drives the
 *  copy at the top of the sheet so the prompt always reads as
 *  "here's why we're asking" rather than a generic interrupt. */
export type UpgradeReason =
  | 'friend_request'   // tried to add or accept a friend
  | 'friend_search'    // tapped the friend search input
  | 'leaderboard_post' // tapped "claim your rank" on the global board
  | 'challenge_send'   // tried to send a friend a challenge
  | 'streak_save'      // surfaced at a streak milestone (day 3 / 7)
  | 'generic';         // catch-all: any social-ish gate without a specific reason

interface UpgradeSheetProps {
  visible: boolean;
  reason: UpgradeReason;
  onClose: () => void;
}

function UpgradeSheetInner({ visible, reason, onClose }: UpgradeSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const gems = useGameStore((s) => s.gems);
  const totalStars = useGameStore((s) => s.totalStars);
  const streakCount = useGameStore((s) => s.streakCount);

  // Fire a single track event per surface. Lets us see in PostHog
  // which prompts convert vs which get dismissed without action.
  useEffect(() => {
    if (visible) {
      track('upgrade_sheet_shown', { reason });
      // Light haptic — this is a "hey, want to save?" moment, not an
      // alarm. Notification haptic would feel punitive.
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, [visible, reason]);

  const handleSave = () => {
    track('upgrade_sheet_action', { reason, action: 'save' });
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onClose();
    // Tiny delay so the sheet's exit animation has a frame to start
    // before the route push pre-empts it. Without this the navigation
    // feels abrupt — the sheet appears to "snap" closed.
    setTimeout(() => router.push('/(auth)/save-account'), 50);
  };

  const handleDismiss = () => {
    track('upgrade_sheet_action', { reason, action: 'dismiss' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop tap dismisses too — standard bottom-sheet UX. */}
      <Pressable style={st.backdrop} onPress={handleDismiss}>
        {/* Inner pressable swallows taps so they don't bubble to the
            backdrop. RN doesn't have a built-in stopPropagation so
            the explicit nested Pressable is the canonical pattern. */}
        <Pressable
          style={[st.sheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Drag handle. Decorative — actual drag-to-dismiss would
              need react-native-gesture-handler which this sheet
              intentionally avoids to stay lightweight. The visual
              cue alone is enough for users to know they can swipe. */}
          <View style={[st.handle, { backgroundColor: colors.borderStrong }]} />

          <View style={st.heroRow}>
            <AnimatedBlink expression="love" size={56} entrance="spring" entranceDelay={120} />
            <View style={st.heroText}>
              <Text style={[st.title, { color: colors.text }]}>
                {t(`upgrade_sheet.reason.${reason}.title`)}
              </Text>
              <Text style={[st.body, { color: colors.textMid }]}>
                {t(`upgrade_sheet.reason.${reason}.body`)}
              </Text>
            </View>
          </View>

          {/* "What you're saving" mini-preview. Tighter than the full
              save-account screen's preview because this sheet has less
              vertical real estate, but enough to reassure the user
              their progress carries over. */}
          <View style={[st.previewRow, { backgroundColor: colors.surface }]}>
            <View style={st.previewItem}>
              <Ionicons name="star" size={16} color={colors.gold} />
              <Text style={[st.previewValue, { color: colors.text }]}>{totalStars}</Text>
              <Text style={[st.previewLabel, { color: colors.textMid }]}>{t('save_account.preview_stars')}</Text>
            </View>
            <View style={[st.previewDivider, { backgroundColor: colors.border }]} />
            <View style={st.previewItem}>
              <Ionicons name="flame" size={16} color={colors.wrong} />
              <Text style={[st.previewValue, { color: colors.text }]}>{streakCount}</Text>
              <Text style={[st.previewLabel, { color: colors.textMid }]}>{t('save_account.preview_streak')}</Text>
            </View>
            <View style={[st.previewDivider, { backgroundColor: colors.border }]} />
            <View style={st.previewItem}>
              <Ionicons name="diamond" size={16} color={colors.accent} />
              <Text style={[st.previewValue, { color: colors.text }]}>{gems}</Text>
              <Text style={[st.previewLabel, { color: colors.textMid }]}>{t('save_account.preview_gems')}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              st.saveBtn,
              { backgroundColor: colors.accent },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={t('upgrade_sheet.save_aria')}
          >
            <Ionicons name="bookmark" size={16} color="#FFFFFF" />
            <Text style={st.saveBtnText}>{t('upgrade_sheet.save_cta')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.dismissBtn, pressed && { opacity: 0.6 }]}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('common.not_now')}
          >
            <Text style={[st.dismissText, { color: colors.textMid }]}>{t('common.not_now')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const UpgradeSheet = React.memo(UpgradeSheetInner);
export default UpgradeSheet;

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  heroText: { flex: 1, gap: spacing.xs },
  title: { fontSize: 19, fontWeight: '800', lineHeight: 24 },
  body: { fontSize: typography.sizes.md, lineHeight: 20 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  previewItem: { flex: 1, alignItems: 'center', gap: 2 },
  previewDivider: { width: 1, height: 28 },
  previewValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  previewLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    marginBottom: spacing.sm,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '700' },
  dismissBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  dismissText: { fontSize: typography.sizes.md, fontWeight: '600' },
});
