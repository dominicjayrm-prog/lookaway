/**
 * profanityFilter — username validation to keep the leaderboard and
 * friend-challenge UI safe for Apple review (Guideline 1.2 / 4.3).
 *
 * Two-layer defence:
 *   1. This client-side check (fast, offline-friendly) blocks most
 *      things at signup before we round-trip to the server.
 *   2. A Postgres trigger (see sql/username_profanity_trigger.sql)
 *      enforces the same rules on insert/update, so a user who
 *      bypasses the client (direct supabase calls from a devtools
 *      console, say) still can't set a banned username.
 *
 * We use `obscenity` for the main profanity match — it's designed to
 * catch l33t-speak ("f@ck"), symbol substitution, whitespace bypass,
 * and some unicode homoglyphs out of the box. Hand-rolled blocklists
 * miss all of those.
 *
 * On top of obscenity we add:
 *   - A reserved-name list (admin, blanked, support, moderator, etc.)
 *     so nobody impersonates staff / the app itself.
 *   - A format guard (3-20 chars, alphanumeric + underscore, can't
 *     start or end with underscore, can't be all numbers).
 */
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Names users can't claim — impersonation vectors or app-reserved
// system labels. Case-insensitive; normalised before check so
// "Admin_01" also blocks "admin". Keep this list short and
// high-signal; broader filtering lives in the obscenity dataset.
const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'blanked',
  'blankedapp',
  'blankedofficial',
  'moderator',
  'mod',
  'support',
  'staff',
  'team',
  'official',
  'apple',
  'google',
  'system',
  'root',
  'null',
  'undefined',
  'anonymous',
  'guest',
]);

export type UsernameError =
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'bad_edge'        // leading/trailing underscore or digit-only
  | 'reserved'
  | 'profane';

export interface UsernameCheckResult {
  ok: boolean;
  error?: UsernameError;
  /** User-facing copy we can render under the input. */
  message?: string;
}

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Validate a candidate username. Call this on submit AND on blur
 * (not on every keystroke — too noisy). Server trigger is the
 * authoritative check; this is the fast-feedback layer.
 */
export function checkUsername(raw: string): UsernameCheckResult {
  const trimmed = raw.trim();

  if (trimmed.length < 3) {
    return { ok: false, error: 'too_short', message: 'Usernames need to be at least 3 characters.' };
  }
  if (trimmed.length > 20) {
    return { ok: false, error: 'too_long', message: 'Usernames can be at most 20 characters.' };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return { ok: false, error: 'invalid_chars', message: 'Usernames can only contain letters, numbers, and underscores.' };
  }
  if (trimmed.startsWith('_') || trimmed.endsWith('_') || /^\d+$/.test(trimmed)) {
    return { ok: false, error: 'bad_edge', message: "Usernames can't start or end with an underscore, or be just numbers." };
  }

  const lower = trimmed.toLowerCase();
  if (RESERVED_NAMES.has(lower)) {
    return { ok: false, error: 'reserved', message: 'That name is reserved. Please pick another.' };
  }

  if (matcher.hasMatch(trimmed)) {
    return { ok: false, error: 'profane', message: "That name isn't allowed. Please pick another." };
  }

  return { ok: true };
}

/**
 * Boolean-only convenience for callers that don't need the structured
 * result (e.g. server-side pre-checks before inserting into
 * `public.profiles`).
 */
export function isUsernameClean(raw: string): boolean {
  return checkUsername(raw).ok;
}
