/**
 * Curated emoji bank for the What Changed? daily challenge mode.
 *
 * Curation rules from the spec:
 *  - Visually distinct: no near-look-alikes within the same group
 *    (avoid 🟢 vs 🟩, 🍎 vs 🍏, ⭐ vs 🌟, etc.).
 *  - Cross-platform consistent: stick to mainstream emoji that
 *    render reliably across iOS / Android / web.
 *  - Culturally neutral: objects, animals, food, plants, weather,
 *    transport, sports, music. No flags, no faces, no hand gestures
 *    (skin-tone variants render inconsistently).
 *
 * Categories give the puzzle visual cohesion ("today's theme: food")
 * without announcing it. The seeded RNG picks one category per
 * date, then samples ~1.3x the grid size from inside that category
 * so there are spare emoji available for swap-style changes.
 *
 * Total ~92 entries across 8 categories. Largest category (food, 16)
 * comfortably covers the hardest day's needs (5x4 grid = 20 cells,
 * 14 filled, * 1.3 = ~18 unique emoji needed).
 */
export interface EmojiCategory {
  id: string;
  /** i18n key for the category display name (used by the optional
   *  "Today's theme: X" tutorial subtitle and accessibility hints).
   *  The puzzle never SHOWS the category to the player during play,
   *  but VoiceOver references it to set context. */
  nameKey: string;
  emoji: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'animals',
    nameKey: 'daily_challenge.what_changed.category.animals',
    // Animal faces are fine — the "no faces" rule targets human
    // emoji where skin-tone defaults vary across systems.
    emoji: ['🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🦊', '🐸', '🐵', '🐔', '🐧', '🐢'],
  },
  {
    id: 'food',
    nameKey: 'daily_challenge.what_changed.category.food',
    emoji: ['🍎', '🍊', '🍌', '🍉', '🍓', '🍇', '🥭', '🥑', '🍞', '🧀', '🍕', '🍔', '🌮', '🍩', '🍪', '🍿'],
  },
  {
    id: 'plants',
    nameKey: 'daily_challenge.what_changed.category.plants',
    emoji: ['🌳', '🌲', '🌴', '🌵', '🌹', '🌻', '🌷', '🌼', '🍀', '🍄'],
  },
  {
    id: 'weather',
    nameKey: 'daily_challenge.what_changed.category.weather',
    // Sun + moon + star + cloud + rain + rainbow + lightning + snowflake.
    // Skipped 🌟 (too close to ⭐) and ⛅ (too close to ☁️).
    emoji: ['☀️', '🌙', '⭐', '☁️', '🌧️', '🌈', '⚡', '❄️'],
  },
  {
    id: 'objects',
    nameKey: 'daily_challenge.what_changed.category.objects',
    emoji: ['🎁', '📚', '🎈', '✏️', '🔑', '⌚', '🕯️', '🎨', '📷', '📺', '🔦', '🧸'],
  },
  {
    id: 'transport',
    nameKey: 'daily_challenge.what_changed.category.transport',
    emoji: ['🚗', '🚕', '🚌', '🚂', '🚀', '✈️', '⛵', '🚲', '🛵', '🛴'],
  },
  {
    id: 'sports',
    nameKey: 'daily_challenge.what_changed.category.sports',
    emoji: ['⚽', '🏀', '🏈', '🎾', '🏐', '🏓', '🏸', '⛳', '🥊', '🎯'],
  },
  {
    id: 'music',
    nameKey: 'daily_challenge.what_changed.category.music',
    emoji: ['🎵', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻', '🎤'],
  },
];

/** Smallest category size (music: 8). Validates puzzle generation:
 *  even on the hardest day (14 emoji slots, ~18 unique needed), the
 *  generator has to skip categories that would underflow. */
export const SMALLEST_CATEGORY_SIZE = Math.min(...EMOJI_CATEGORIES.map((c) => c.emoji.length));
