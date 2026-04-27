/**
 * Mulberry32 — a fast, high-quality 32-bit seeded PRNG. Picked over
 * Math.random because every player on Earth must produce the SAME
 * daily-challenge content from the same UTC date, and JS's built-in
 * RNG isn't seedable.
 *
 * Stateless API: pass the seed in, get a generator out, pull as many
 * values as you need. Same seed in = same sequence out, deterministic
 * across V8 / JSC / Hermes / web.
 */

export interface SeededRng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max] inclusive. */
  intInclusive(min: number, max: number): number;
  /** Picks one element from the array. */
  pick<T>(arr: readonly T[]): T;
  /** Fisher-Yates shuffle (returns a new array, doesn't mutate). */
  shuffle<T>(arr: readonly T[]): T[];
}

export function createSeededRng(seed: number): SeededRng {
  // Coerce to uint32, normalise zero so the algorithm doesn't lock at 0.
  let state = (seed >>> 0) || 0x9E3779B9;

  function next(): number {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    intInclusive(min, max) {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      if (arr.length === 0) throw new Error('pick called on empty array');
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** UTC date -> YYYYMMDD integer seed. Always UTC so a player at
 *  11pm in NY and 6am in London get the same daily on the same
 *  calendar day. */
export function dateToSeed(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}

/** Today's UTC date as a YYYY-MM-DD string. Matches Postgres DATE
 *  format so it can be compared against challenge_date directly. */
export function todayUtcIso(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Day of week in UTC. 0 = Sunday through 6 = Saturday, matching
 *  JS's Date.getUTCDay() so it slots into existing date math. */
export function utcDayOfWeek(date: Date = new Date()): number {
  return date.getUTCDay();
}
