/**
 * Generates the Wordle-style share text for a completed daily.
 *
 * Mode-agnostic on purpose: every mode contributes its own emoji
 * blocks via the shareCardEmojiBlocks string, and this function
 * just splices them into a fixed template. Phases 3-5 modes will
 * plug in without touching this file.
 *
 * Format example:
 *   Blanked Daily — Mar 27
 *   📱 Phone Number
 *   Score: 87/100 · 12.4s
 *   🟪🟪🟪🟪🟪🟪⬛
 *   🔥 47 day streak
 *   Play yours: <App Store link>
 */
import { t } from '@/src/i18n';
import type { DailyChallengeModeId } from '../types';
import { getModeDisplayName } from '../modeRotation';
import { formatHumanDate } from '../formatDate';

const MODE_EMOJI: Record<DailyChallengeModeId, string> = {
  // Per Phase 3 spec: 👁️ (eye, for visual observation) is What
  // Changed's mode-emoji prefix in the share text. Phone Number
  // keeps 📱; future modes will fill in their own.
  phone_number: '📱',
  what_changed: '👁️',
  names_and_faces: '🧑‍🤝‍🧑',
  the_witness: '🕵️',
  mental_maths: '🧮',
};

// Marketing site that deep-links to the App Store / Google Play
// listing per platform. Was 'blanked.app' in v1; the canonical
// marketing domain is playblanked.com.
const PLAY_URL = 'https://playblanked.com';

export interface ShareCardArgs {
  mode: DailyChallengeModeId;
  /** UTC YYYY-MM-DD; rendered as "Mar 27" / locale date. */
  challengeDate: string;
  score: number;
  timeSeconds: number;
  shareCardEmojiBlocks: string;
  streakCount: number;
}

export function buildShareCardText(args: ShareCardArgs): string {
  const dateLabel = formatHumanDate(args.challengeDate);
  const lines: string[] = [];
  lines.push(t('daily_challenge.share_text.header', { date: dateLabel }));
  lines.push(`${MODE_EMOJI[args.mode]} ${getModeDisplayName(args.mode)}`);
  lines.push(t('daily_challenge.share_text.score_line', { score: args.score, time: formatTime(args.timeSeconds) }));
  if (args.shareCardEmojiBlocks) lines.push(args.shareCardEmojiBlocks);
  if (args.streakCount >= 2) {
    lines.push(t('daily_challenge.share_text.streak_line', { count: args.streakCount }));
  }
  lines.push(t('daily_challenge.share_text.play_line', { url: PLAY_URL }));
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}m ${s}s`;
}
