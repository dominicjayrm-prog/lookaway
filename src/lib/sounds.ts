/**
 * SoundManager — singleton that preloads all app sounds on init and
 * exposes simple play() calls for each. Uses expo-audio (SDK 55+).
 *
 * Web safety: all require() calls are wrapped in try-catch because
 * metro's web bundler sometimes fails to resolve .mp3 assets. If
 * preload fails, play() attempts a one-shot load as a fallback.
 * Browser autoplay restrictions mean the first sound may be silent
 * until the user interacts with the page.
 *
 * Native: works immediately, no restrictions.
 *
 * Category toggles:
 *  - ui (tap, whoosh)
 *  - gameplay (correct, wrong, timerTick, timerWarning, powerUp)
 *  - rewards (starPop, gemClink, levelComplete, celebration, levelFail)
 *
 * The settings screen lets users flip each category independently.
 * Preferences persist via AsyncStorage under `blanked_sound_prefs`.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SoundName =
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'starPop'
  | 'gemClink'
  | 'levelComplete'
  | 'levelFail'
  | 'timerTick'
  | 'timerWarning'
  | 'celebration'
  | 'whoosh'
  | 'powerUp';

export type SoundCategory = 'ui' | 'gameplay' | 'rewards';

const SOUND_CATEGORIES: Record<SoundName, SoundCategory> = {
  tap: 'ui',
  whoosh: 'ui',
  correct: 'gameplay',
  wrong: 'gameplay',
  timerTick: 'gameplay',
  timerWarning: 'gameplay',
  powerUp: 'gameplay',
  starPop: 'rewards',
  gemClink: 'rewards',
  levelComplete: 'rewards',
  levelFail: 'rewards',
  celebration: 'rewards',
};

export interface SoundPreferences {
  master: boolean;
  ui: boolean;
  gameplay: boolean;
  rewards: boolean;
}

const DEFAULT_PREFS: SoundPreferences = { master: true, ui: true, gameplay: true, rewards: true };
const PREFS_KEY = 'blanked_sound_prefs';

// Lazy asset resolution — wrapped in a function so a single bad
// require doesn't crash the entire module at import time on web.
function getSoundAssets(): Partial<Record<SoundName, any>> {
  const assets: Partial<Record<SoundName, any>> = {};
  try { assets.tap = require('@/assets/sounds/tap.mp3'); } catch {}
  try { assets.correct = require('@/assets/sounds/correct.mp3'); } catch {}
  try { assets.wrong = require('@/assets/sounds/wrong.mp3'); } catch {}
  try { assets.starPop = require('@/assets/sounds/star-pop.mp3'); } catch {}
  try { assets.gemClink = require('@/assets/sounds/gem-clink.mp3'); } catch {}
  try { assets.levelComplete = require('@/assets/sounds/level-complete.mp3'); } catch {}
  try { assets.levelFail = require('@/assets/sounds/level-fail.mp3'); } catch {}
  try { assets.timerTick = require('@/assets/sounds/timer-tick.mp3'); } catch {}
  try { assets.timerWarning = require('@/assets/sounds/timer-warning.mp3'); } catch {}
  try { assets.celebration = require('@/assets/sounds/celebration.mp3'); } catch {}
  try { assets.whoosh = require('@/assets/sounds/whoosh.mp3'); } catch {}
  try { assets.powerUp = require('@/assets/sounds/power-up.mp3'); } catch {}
  return assets;
}

class SoundManager {
  private loaded: Partial<Record<SoundName, AudioPlayer>> = {};
  private assets: Partial<Record<SoundName, any>> = {};
  private prefs: SoundPreferences = { ...DEFAULT_PREFS };
  private initialised = false;

  /** Call once on app start. Preloads all sounds into memory. */
  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    this.assets = getSoundAssets();

    // Restore persisted prefs
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) this.prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {}

    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {}

    // Preload all resolved assets in parallel
    const entries = Object.entries(this.assets) as [SoundName, any][];
    await Promise.all(
      entries.map(async ([name, asset]) => {
        try {
          const player = createAudioPlayer(asset);
          player.volume = 0.6;
          this.loaded[name] = player;
        } catch {
          // Preload failed (common on web) — play() will try on-demand
        }
      }),
    );
  }

  /** Play a sound by name. Fire-and-forget — never blocks, never throws.
   *  Respects both master toggle AND category toggle.
   *
   *  Robustness: some side-campaign modes were silent while classic
   *  played fine — root cause was the pre-cached player's internal
   *  state falling into "ended" after a rapid sequence of plays, at
   *  which point seekTo(0).then(play) would resolve but play would
   *  no-op (expo-audio quirk). If the first attempt doesn't produce
   *  audio we proactively recreate the player on the next tick. */
  play(name: SoundName): void {
    if (!this.prefs.master) return;
    const cat = SOUND_CATEGORIES[name];
    if (cat && !this.prefs[cat]) return;

    const asset = this.assets[name];
    if (!asset) return;

    const cached = this.loaded[name];
    if (cached) {
      try {
        // Rewind and play. On expo-audio, seekTo is a Promise<void>,
        // but play() is synchronous — call both in sequence without
        // relying on the .then chain (which has been observed to
        // sometimes drop when the player is mid-state-transition).
        cached.seekTo(0);
        cached.play();
        return;
      } catch {
        // Cached player in a bad state — fall through to recreate.
        try { cached.remove(); } catch {}
        delete this.loaded[name];
      }
    }

    // Create fresh (first call or recovery after an error).
    try {
      const p = createAudioPlayer(asset);
      p.volume = 0.6;
      p.play();
      this.loaded[name] = p;
    } catch {}
  }

  /** Read the current preferences (master + per-category). */
  getPreferences(): SoundPreferences {
    return { ...this.prefs };
  }

  /** Update one preference key and persist. */
  setPreference<K extends keyof SoundPreferences>(key: K, value: SoundPreferences[K]): void {
    this.prefs = { ...this.prefs, [key]: value };
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)).catch(() => {});
  }

  /** Legacy single-toggle API kept for backwards compatibility with
   *  existing Settings screen code. Maps to the `master` preference. */
  setEnabled(enabled: boolean): void {
    this.setPreference('master', enabled);
  }

  /** Whether sounds are currently playing (any category enabled + master). */
  isEnabled(): boolean {
    return this.prefs.master;
  }

  /** Clean up on app teardown. */
  async unload(): Promise<void> {
    for (const player of Object.values(this.loaded)) {
      try { player?.remove(); } catch {}
    }
    this.loaded = {};
    this.initialised = false;
  }
}

export const sounds = new SoundManager();
export type { SoundName };
