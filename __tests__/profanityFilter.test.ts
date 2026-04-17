/**
 * Sanity tests for the username profanity / format checks. Covers
 * the common categories a reviewer is likely to try.
 */
import { checkUsername } from '@/src/utils/profanityFilter';

describe('checkUsername', () => {
  // ── happy path ────────────────────────────────────────────────
  it.each(['player123', 'memory_pro', 'blink_fan', 'dom_j', 'sarahh', 'pixel_hunter'])(
    'accepts %s',
    (name) => {
      expect(checkUsername(name).ok).toBe(true);
    },
  );

  // ── format rules ──────────────────────────────────────────────
  it('rejects names under 3 chars', () => {
    expect(checkUsername('ab').error).toBe('too_short');
  });

  it('rejects names over 20 chars', () => {
    expect(checkUsername('a'.repeat(21)).error).toBe('too_long');
  });

  it('rejects invalid characters', () => {
    expect(checkUsername('player!').error).toBe('invalid_chars');
    expect(checkUsername('bad space').error).toBe('invalid_chars');
    expect(checkUsername('émoji').error).toBe('invalid_chars');
  });

  it('rejects leading / trailing underscores and digit-only names', () => {
    expect(checkUsername('_player').error).toBe('bad_edge');
    expect(checkUsername('player_').error).toBe('bad_edge');
    expect(checkUsername('12345').error).toBe('bad_edge');
  });

  // ── reserved names ────────────────────────────────────────────
  it.each(['admin', 'Admin', 'BLANKED', 'support', 'moderator', 'official'])(
    'rejects reserved name %s',
    (name) => {
      expect(checkUsername(name).error).toBe('reserved');
    },
  );

  // ── profanity (literal) ───────────────────────────────────────
  it.each(['fuckface', 'shithead', 'bitch01', 'asshole99'])(
    'rejects profanity %s',
    (name) => {
      expect(checkUsername(name).ok).toBe(false);
    },
  );

  // ── profanity (l33t-speak / symbol substitution) ──────────────
  // These are the cases that hand-rolled blocklists miss and that
  // get apps rejected — `obscenity` is specifically designed to
  // catch them.
  it.each(['f4ckface', 'sh1thead', 'a$$hole'])(
    'rejects l33t-speak bypass %s',
    (name) => {
      expect(checkUsername(name).ok).toBe(false);
    },
  );
});
