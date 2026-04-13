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
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

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
  private enabled = true;
  private initialised = false;

  /** Call once on app start. Preloads all sounds into memory. */
  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    this.assets = getSoundAssets();

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

  /** Play a sound by name. Fire-and-forget — never blocks, never throws. */
  play(name: SoundName): void {
    if (!this.enabled) return;

    const player = this.loaded[name];
    if (player) {
      // Preloaded — rewind + play
      player.seekTo(0).then(() => player.play()).catch(() => {});
      return;
    }

    // Preload missed — try one-shot load + play as fallback
    const asset = this.assets[name];
    if (!asset) return;
    try {
      const p = createAudioPlayer(asset);
      p.volume = 0.6;
      p.play();
      // Cache for next time
      this.loaded[name] = p;
    } catch {}
  }

  /** Enable/disable all sounds (user settings toggle). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
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
