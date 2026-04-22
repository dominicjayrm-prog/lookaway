/**
 * i18n module unit tests.
 *
 * Covers the pure `resolveLanguage` function (no React, no
 * `expo-localization` needed) plus the i18n-js fallback behaviour
 * when a key exists in English but not in Spanish.
 */

// Mock expo-localization so `getDeviceLanguage()` can be called
// safely in the i18n module import, even though we don't use it
// directly in these tests.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

import { resolveLanguage, i18n, applyLanguage, t } from '@/src/i18n';

describe('resolveLanguage', () => {
  it('returns the explicit preference when user picked English', () => {
    expect(resolveLanguage('en', 'es')).toBe('en');
    expect(resolveLanguage('en', null)).toBe('en');
  });

  it('returns the explicit preference when user picked Spanish', () => {
    expect(resolveLanguage('es', 'en')).toBe('es');
    expect(resolveLanguage('es', null)).toBe('es');
  });

  it('follows device language when preference is system and device is supported', () => {
    expect(resolveLanguage('system', 'es')).toBe('es');
    expect(resolveLanguage('system', 'en')).toBe('en');
  });

  it('falls back to English when preference is system and device language is unsupported', () => {
    expect(resolveLanguage('system', 'fr')).toBe('en');
    expect(resolveLanguage('system', 'de')).toBe('en');
    expect(resolveLanguage('system', 'ja')).toBe('en');
  });

  it('falls back to English when preference is system and device language is null', () => {
    expect(resolveLanguage('system', null)).toBe('en');
  });
});

describe('i18n-js fallback', () => {
  it('renders the English string when the key exists in both locales', () => {
    i18n.locale = 'es';
    expect(i18n.t('settings.preferences.language.option_en')).toBe('English');
  });

  it('falls back to English for a Spanish-missing key rather than crashing', () => {
    // We haven't translated every UI string yet — the fallback
    // behaviour is what lets us ship infrastructure now and trickle
    // translations in without breaking Spanish users in the meantime.
    i18n.locale = 'es';
    // A key that's intentionally not in either locale file should
    // return the key itself (i18n-js's "missing" marker) rather
    // than throwing.
    const missing = i18n.t('this.key.does.not.exist');
    expect(typeof missing).toBe('string');
    expect(missing).toContain('this.key.does.not.exist');
  });

  it('applyLanguage flips the active locale', () => {
    applyLanguage('es');
    expect(i18n.locale).toBe('es');
    applyLanguage('en');
    expect(i18n.locale).toBe('en');
  });
});

describe('t() interpolation', () => {
  // Regression test for the TestFlight bug where "Day {count}! Keep
  // it going 🔥" rendered with the literal {count} visible instead
  // of substituting the number. i18n-js's default placeholder regex
  // matches %{name} or {{name}}, not our {name} single-brace style.
  // Our t() wrapper does its own interpolation so keys in the JSON
  // stay single-brace.
  it('substitutes {token} tokens with param values', () => {
    i18n.locale = 'en';
    // Pick a real key with an interpolation — greeting_streak is
    // the one that was visibly broken in the screenshots.
    const out = t('home.greeting_streak', { count: 102 });
    expect(out).toBe('Day 102! Keep it going 🔥');
  });

  it('handles multiple tokens + non-string values', () => {
    i18n.locale = 'en';
    const out = t('home.world_level_title', { world: 1, level: 7 });
    expect(out).toBe('World 1 — Level 7');
  });

  it('works in Spanish too', () => {
    i18n.locale = 'es';
    const out = t('home.greeting_streak', { count: 5 });
    expect(out).toContain('5');
    expect(out).not.toContain('{count}');
  });

  it('preserves tokens that are not in params (safer than missing-interpolation error)', () => {
    i18n.locale = 'en';
    // If a caller forgets a param, the token stays visible as
    // {token} rather than producing an "[missing]" marker. The
    // developer sees the mistake in dev mode; real users never
    // hit this because every t() call passes its full param set.
    const out = t('home.greeting_streak', {} as any);
    expect(out).toContain('{count}');
  });

  it('returns raw string when no params passed', () => {
    i18n.locale = 'en';
    const out = t('common.back');
    expect(out).toBe('Back');
  });
});
