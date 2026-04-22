/**
 * Review-prompt orchestration.
 *
 * Pure gating logic for the in-app "Rate BLANKED" two-stage flow:
 *   Stage A  — our own BLANKED-branded modal (ReviewPrompt.tsx)
 *   Stage B  — Apple's native rating sheet via SKStoreReviewController
 *
 * Stage A is ours to tune and can fire every 60 days. Stage B is
 * Apple-rate-limited to 3 shows per 365 days across the whole app,
 * which is why we only escalate to it when the user actively taps
 * "Sure" — that way we don't burn quota on drive-by dismisses.
 *
 * `shouldShowReviewPrompt()` is pure on purpose so it's trivially
 * unit-testable. The store builds a snapshot and calls it; the modal
 * stays dumb and just renders what it's told.
 */
import { Platform } from 'react-native';

/** Snapshot the store hands us when asking "may we prompt?". Kept flat
 *  and primitive so the function is easy to test in isolation. */
export interface ReviewPromptState {
  reviewPromptOutcome: 'accepted' | 'dismissed' | null;
  lastReviewPromptedAt: string | null;
  completedLevelCount: number;
  lives: number;
}

export type ReviewPromptSkipReason =
  | 'platform_not_ios'
  | 'already_accepted'
  | 'too_few_levels'
  | 'out_of_lives_flow'
  | 'cooldown_active';

export type ReviewPromptGateResult =
  | { ok: true }
  | { ok: false; reason: ReviewPromptSkipReason };

// Minimum campaign levels cleared before we'll ask. User's guidance
// was "avoid the first 3 levels of world 1", so 4 gives a 1-level
// buffer above that floor.
export const MIN_LEVELS_COMPLETED = 4;

// Stage A cooldown. Apple's native sheet (Stage B) is itself rate-
// limited to 3/year — our gate on top keeps us from bombarding users
// who just said "maybe later".
export const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/** Pure gate — given a snapshot, say whether we can fire Stage A
 *  right now. `now` is injectable so tests can pin a clock.
 *
 *  The order of checks matters for analytics: we report the FIRST
 *  reason that fails, so keep the cheapest/most-common ones early. */
export function shouldShowReviewPrompt(
  state: ReviewPromptState,
  now: number = Date.now(),
): ReviewPromptGateResult {
  if (Platform.OS !== 'ios') {
    return { ok: false, reason: 'platform_not_ios' };
  }
  if (state.reviewPromptOutcome === 'accepted') {
    return { ok: false, reason: 'already_accepted' };
  }
  if (state.completedLevelCount < MIN_LEVELS_COMPLETED) {
    return { ok: false, reason: 'too_few_levels' };
  }
  // Never prompt mid-friction. Out-of-lives is the emotional opposite
  // of a peak-joy moment — asking for a rating there is a self-own.
  if (state.lives <= 0) {
    return { ok: false, reason: 'out_of_lives_flow' };
  }
  if (state.lastReviewPromptedAt) {
    const last = Date.parse(state.lastReviewPromptedAt);
    if (Number.isFinite(last) && now - last < COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown_active' };
    }
  }
  return { ok: true };
}

/** Fire the native Apple rating sheet. Safe to call on any platform —
 *  Android and web silently no-op. Failures are swallowed; the sheet
 *  is an optional perk, never a required flow.
 *
 *  IMPORTANT: the caller should have already checked `shouldShowReviewPrompt`
 *  and recorded an 'accepted' outcome BEFORE invoking this. */
export async function triggerNativeStoreReview(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const StoreReview = await import('expo-store-review');
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await StoreReview.requestReview();
  } catch {
    // No-op: native sheet is best-effort. If the module is missing
    // from a dev build, or Apple's quota is exhausted, we just don't
    // show the sheet — we already tracked the acceptance so the user
    // isn't re-prompted.
  }
}
