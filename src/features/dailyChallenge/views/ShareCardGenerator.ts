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
import type { DailyChallengeModeId } from '../types';

const MODE_EMOJI: Record<DailyChallengeModeId, string> = {
  phone_number: '📱',
  what_changed: '🔍',
  names_and_faces: '🧑‍🤝‍🧑',
  the_witness: '🕵️',
};

const MODE_LABEL: Record<DailyChallengeModeId, string> = {
  phone_number: 'Phone Number',
  what_changed: 'What Changed',
  names_and_faces: 'Names & Faces',
  the_witness: 'The Witness',
};

// Apple/Google Play share-link gets stamped into builds; for now
// keep the marketing site URL since it deep-links the right store
// listing per platform.
const PLAY_URL = 'https://blanked.app';

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
  const dateLabel = formatShortDate(args.challengeDate);
  const lines: string[] = [];
  lines.push(`Blanked Daily — ${dateLabel}`);
  lines.push(`${MODE_EMOJI[args.mode]} ${MODE_LABEL[args.mode]}`);
  lines.push(`Score: ${args.score}/100 · ${formatTime(args.timeSeconds)}`);
  if (args.shareCardEmojiBlocks) lines.push(args.shareCardEmojiBlocks);
  if (args.streakCount >= 2) {
    lines.push(`🔥 ${args.streakCount} day streak`);
  }
  lines.push(`Play yours: ${PLAY_URL}`);
  return lines.join('\n');
}

function formatShortDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  if (!y || !m || !d) return yyyymmdd;
  // Use Date with year/month/day in UTC, format with month name +
  // day. Skip Intl formatter on web where locale formatting can
  // sometimes print the wrong month for borderline timezones.
  const date = new Date(Date.UTC(y, m - 1, d));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}m ${s}s`;
}
