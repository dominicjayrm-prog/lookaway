/**
 * BLANKED i18n layer.
 *
 * Thin wrapper over `i18n-js` that:
 *  - Detects the device locale via `expo-localization`.
 *  - Resolves the effective language from the user's preference
 *    ('system' | 'en' | 'es') — `system` defers to the device.
 *  - Exposes `t(key, params?)` for rendering, plus `setLocale()` for
 *    switching from the settings screen.
 *  - Falls back to English automatically when an `es.json` key is
 *    missing (lets us ship partially-translated features safely).
 *
 * We intentionally keep the module stateless apart from the `I18n`
 * instance itself. The store owns `preferredLanguage`, calls
 * `setLocale()` when it changes, and the rendered UI re-reads via
 * `t()` on every render — no context provider needed, which keeps
 * the API surface minimal and sidesteps a whole class of React
 * provider-ordering bugs.
 */
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

/** User preference — what they picked in settings.
 *  'system' = follow device locale. */
export type LanguagePreference = 'system' | 'en' | 'es';

/** Effective locale after resolving 'system' against the device. */
export type ResolvedLanguage = 'en' | 'es';

/** All languages we currently ship. Add to this list when we
 *  introduce French/German/etc. — `resolveLanguage` handles the
 *  device-locale match automatically. */
export const SUPPORTED_LANGUAGES: ResolvedLanguage[] = ['en', 'es'];

/** Shared i18n-js instance. Exported for the (rare) case where a
 *  caller needs to drop down to raw API (e.g. pluralisation rules). */
export const i18n = new I18n(
  { en, es },
  {
    defaultLocale: 'en',
    // When a key is missing in the active locale, i18n-js will try
    // the default ('en'). This is what we want — partially-translated
    // features render in English rather than showing "[missing …]".
    enableFallback: true,
  },
);

// When a key is missing from BOTH locales, i18n-js defaults to
// rendering `[missing "en.some.key" translation]` — visible ugliness
// that leaked onto production screens (cosmetic names on the
// profile + shop cards). Register a custom missing-translation
// handler that returns the raw scope, so call sites can detect
// missing keys via a simple `result === key` check and fall back to
// an inline English literal (what `installCosmeticTranslations` in
// src/data/cosmetics.ts relies on). Exposed as a registered strategy
// because i18n-js v4 doesn't accept this as a constructor option.
i18n.missingTranslation.register('blanked_return_key', (_i18n, scope) => String(scope));
i18n.missingBehavior = 'blanked_return_key';

/** Read the device's primary locale language code (e.g. 'es' from
 *  'es-MX'). Used when `preferredLanguage === 'system'`. Safe to call
 *  on web — `expo-localization` ships a DOM polyfill that falls back
 *  to `navigator.language`. */
export function getDeviceLanguage(): string | null {
  try {
    const locales = Localization.getLocales();
    return locales[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

/** Resolve the effective language from the user's preference and
 *  the device locale. Pure — takes the device language as a param
 *  so it's trivially unit-testable. */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguage: string | null,
): ResolvedLanguage {
  if (preference === 'en' || preference === 'es') return preference;
  // 'system' — map the device language onto one of our supported
  // locales. Anything we don't support (fr, de, ja…) falls back to
  // English, which is the right call for a v1 shipping just en+es.
  if (deviceLanguage && (SUPPORTED_LANGUAGES as string[]).includes(deviceLanguage)) {
    return deviceLanguage as ResolvedLanguage;
  }
  return 'en';
}

/** Apply a language to the i18n instance. Call this once on app
 *  boot (from `_layout.tsx`) and again whenever `preferredLanguage`
 *  changes in the store so the whole UI re-renders in the new
 *  language on the next frame. */
export function applyLanguage(preference: LanguagePreference): ResolvedLanguage {
  const resolved = resolveLanguage(preference, getDeviceLanguage());
  i18n.locale = resolved;
  return resolved;
}

/** Read the active i18n locale, clamped to one of the supported set.
 *  i18n-js exposes `.locale` as a public property but as `string`,
 *  which is too loose for callers that fan out behaviour by locale.
 *  This returns a narrow union — anything we haven't translated falls
 *  through to English. */
export function getCurrentLocale(): ResolvedLanguage {
  return i18n.locale === 'es' ? 'es' : 'en';
}

/** Render a key. Thin wrapper so components never touch `i18n-js`
 *  directly — if we swap libraries (or roll our own) this is the
 *  single migration point.
 *
 *  CRITICAL — we do our OWN interpolation rather than delegating to
 *  i18n-js. The library's default placeholder regex matches `%{name}`
 *  (Rails-style) or `{{name}}` (mustache-style), NOT the `{name}`
 *  single-brace syntax our translation files use. Without this local
 *  substitution every t('key', { foo: 1 }) would render the raw token
 *  `{foo}` on screen — the bug a TestFlight user hit in v1.1.0
 *  build 24 where "Day {count}! Keep it going 🔥" showed up
 *  literally. We keep single-brace syntax in the JSON because it's
 *  what most modern i18n tooling expects and it reads cleaner in
 *  both languages; pre-processing here means none of the ~1000
 *  existing translations need to change.
 *
 *  If a token in the string isn't found in `params`, the raw
 *  `{token}` is preserved (visible to the developer, acceptable
 *  fallback rather than i18n-js's "[missing …]" marker that makes
 *  the app look broken). */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = i18n.t(key);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(params, token)
      ? String(params[token])
      : match
  ));
}
