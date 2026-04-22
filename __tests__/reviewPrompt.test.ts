/**
 * Unit tests for the pure review-prompt gating function.
 *
 * shouldShowReviewPrompt is intentionally pure — given a state
 * snapshot, it returns either { ok: true } or { ok: false, reason }.
 * Every gate condition gets its own test so a regression on any
 * of them shows up as a named test failure, not a mysterious
 * "user not prompted" bug in production.
 */

// Default mock — iOS. Individual tests override Platform for the
// platform-gate check.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { shouldShowReviewPrompt, MIN_LEVELS_COMPLETED, COOLDOWN_MS, type ReviewPromptState } from '@/src/lib/reviewPrompt';

function makeState(overrides: Partial<ReviewPromptState> = {}): ReviewPromptState {
  return {
    reviewPromptOutcome: null,
    lastReviewPromptedAt: null,
    completedLevelCount: 10,
    lives: 5,
    ...overrides,
  };
}

describe('shouldShowReviewPrompt', () => {
  it('returns ok on the happy path — iOS, plenty of levels, not yet prompted', () => {
    const result = shouldShowReviewPrompt(makeState());
    expect(result.ok).toBe(true);
  });

  it('skips with platform_not_ios when Platform.OS is not ios', () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    // Re-import under the fresh mock.
    const { shouldShowReviewPrompt: fn } = require('@/src/lib/reviewPrompt');
    const result = fn(makeState());
    expect(result).toEqual({ ok: false, reason: 'platform_not_ios' });
    // Restore iOS for the rest of the suite.
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
  });

  it('skips with already_accepted when outcome is accepted, even if cooldown elapsed', () => {
    const longAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const result = shouldShowReviewPrompt(makeState({
      reviewPromptOutcome: 'accepted',
      lastReviewPromptedAt: longAgo,
    }));
    expect(result).toEqual({ ok: false, reason: 'already_accepted' });
  });

  it('skips with too_few_levels when completed count is below floor', () => {
    const result = shouldShowReviewPrompt(makeState({
      completedLevelCount: MIN_LEVELS_COMPLETED - 1,
    }));
    expect(result).toEqual({ ok: false, reason: 'too_few_levels' });
  });

  it('allows through at exactly the minimum level count', () => {
    const result = shouldShowReviewPrompt(makeState({
      completedLevelCount: MIN_LEVELS_COMPLETED,
    }));
    expect(result.ok).toBe(true);
  });

  it('skips with out_of_lives_flow when lives is 0', () => {
    const result = shouldShowReviewPrompt(makeState({ lives: 0 }));
    expect(result).toEqual({ ok: false, reason: 'out_of_lives_flow' });
  });

  it('skips with out_of_lives_flow when lives is negative (defensive)', () => {
    const result = shouldShowReviewPrompt(makeState({ lives: -1 }));
    expect(result).toEqual({ ok: false, reason: 'out_of_lives_flow' });
  });

  it('skips with cooldown_active when last prompt was within 60 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = shouldShowReviewPrompt(makeState({
      lastReviewPromptedAt: tenDaysAgo,
      reviewPromptOutcome: 'dismissed',
    }));
    expect(result).toEqual({ ok: false, reason: 'cooldown_active' });
  });

  it('allows through once the cooldown has fully elapsed', () => {
    const justOverSixtyDaysAgo = new Date(Date.now() - (COOLDOWN_MS + 1000)).toISOString();
    const result = shouldShowReviewPrompt(makeState({
      lastReviewPromptedAt: justOverSixtyDaysAgo,
      reviewPromptOutcome: 'dismissed',
    }));
    expect(result.ok).toBe(true);
  });

  it('treats unparseable timestamps as "never prompted" instead of blocking forever', () => {
    const result = shouldShowReviewPrompt(makeState({
      lastReviewPromptedAt: 'not-a-date',
    }));
    expect(result.ok).toBe(true);
  });

  it('reports skip reasons in priority order (already_accepted beats cooldown)', () => {
    // Both conditions fail — already_accepted must be reported first
    // because the user should never be re-prompted.
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = shouldShowReviewPrompt(makeState({
      reviewPromptOutcome: 'accepted',
      lastReviewPromptedAt: tenDaysAgo,
    }));
    expect(result).toEqual({ ok: false, reason: 'already_accepted' });
  });

  it('accepts an injected clock so cooldown math is deterministic in tests', () => {
    const pinnedNow = Date.parse('2030-01-01T00:00:00Z');
    const fiftyDaysBefore = new Date(pinnedNow - 50 * 24 * 60 * 60 * 1000).toISOString();
    const result = shouldShowReviewPrompt(
      makeState({ lastReviewPromptedAt: fiftyDaysBefore }),
      pinnedNow,
    );
    expect(result).toEqual({ ok: false, reason: 'cooldown_active' });
  });
});
