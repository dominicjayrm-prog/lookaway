import { t } from '@/src/i18n';
import { WORLD_THEMES, type WorldTheme } from '@/src/data/unifiedJourney';

/** Resolve the localised world name. Falls back to the English name
 *  from WORLD_THEMES if the i18n key is missing (defensive — the key
 *  should exist for every world in every locale). */
export function localizedWorldName(theme: WorldTheme): string {
  const key = `journey.world_names.${theme}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return WORLD_THEMES[theme].name;
}

/** Atmosphere blurb used in the world intro modal. Same fallback rule. */
export function localizedWorldAtmosphere(theme: WorldTheme, englishFallback: string): string {
  const key = `journey.world_atmosphere.${theme}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return englishFallback;
}
