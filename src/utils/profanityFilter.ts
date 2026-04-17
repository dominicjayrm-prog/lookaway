/**
 * profanityFilter — username validation to keep the leaderboard and
 * friend-challenge UI safe for Apple review (Guideline 1.2 / 4.3).
 *
 * Three-layer defence:
 *   1. Synchronous format + reserved-name check — always runs,
 *      zero dependencies, can't fail.
 *   2. `obscenity` dataset for l33t-speak / symbol-substitution /
 *      unicode-homoglyph detection — loaded LAZILY and wrapped in
 *      try/catch so a module-evaluation failure on a particular
 *      platform (Metro web bundler had issues with obscenity's
 *      module format, Hermes could hit the same thing) degrades
 *      gracefully instead of crashing the whole app.
 *   3. A Postgres trigger (sql/username_profanity_trigger.sql) is
 *      the AUTHORITATIVE check. Everything below is just fast
 *      client-side feedback; the server can't be bypassed and
 *      covers every variant either layer 1 or layer 2 catches.
 *
 * Previously this module constructed the obscenity `RegExpMatcher`
 * at top-level on import, which crashed the Vercel web build with
 * "Cannot read properties of undefined (reading 'DataSet')" on any
 * route that indirectly imported this file. Lazy + guarded loading
 * keeps the app alive; the worst case is "profanity check on the
 * client is degraded" which is never a showstopper because the
 * Postgres trigger still rejects bad usernames at insert time.
 */

// Lazy matcher — `null` means we haven't tried yet, `false` means
// we tried and it threw (don't retry), a real object means success.
type Matcher = { hasMatch: (input: string) => boolean };
let _matcher: Matcher | null | false = null;

function getMatcher(): Matcher | null {
  if (_matcher === false) return null;
  if (_matcher) return _matcher;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const obs = require('obscenity');
    if (!obs?.RegExpMatcher || !obs?.englishDataset || !obs?.englishRecommendedTransformers) {
      _matcher = false;
      return null;
    }
    _matcher = new obs.RegExpMatcher({
      ...obs.englishDataset.build(),
      ...obs.englishRecommendedTransformers,
    }) as Matcher;
    return _matcher;
  } catch {
    // Package failed to load / evaluate on this platform. Mark as
    // dead so subsequent calls short-circuit instead of retrying.
    _matcher = false;
    return null;
  }
}

// Names users can't claim — impersonation vectors or app-reserved
// system labels. Case-insensitive. Keep this list short and
// high-signal; broader filtering lives in obscenity + banned_words.
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

/**
 * Bare minimum profanity fallback used when obscenity can't load
 * (e.g. web bundler issue, ESM interop quirk). Just a small set of
 * common slurs and 4-letter words — covers the OBVIOUS cases so an
 * unlucky browser user can't still register `fuckface`. The server
 * trigger remains the authoritative check for everything else.
 */
const FALLBACK_BANNED_SUBSTRINGS = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard',
  'nigger', 'nigga', 'faggot', 'retard', 'kike', 'spic', 'chink',
  'rape', 'pedo', 'nazi', 'hitler',
];

function fallbackHasProfanity(lowered: string): boolean {
  for (const needle of FALLBACK_BANNED_SUBSTRINGS) {
    if (lowered.includes(needle)) return true;
  }
  return false;
}

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
 * Validate a candidate username. Safe to call from any platform —
 * degrades gracefully when obscenity can't load (falls back to the
 * small hard-coded blocklist). Server trigger covers everything
 * else authoritatively.
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

  const matcher = getMatcher();
  const hit = matcher
    ? (() => { try { return matcher.hasMatch(trimmed); } catch { return fallbackHasProfanity(lower); } })()
    : fallbackHasProfanity(lower);
  if (hit) {
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
