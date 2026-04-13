/**
 * SoundManager — singleton that preloads all app sounds on init and
 * exposes simple play() calls for each. Uses expo-av's Audio module.
 *
 * Web: Audio works on web but some browsers block autoplay until user
 * interaction. The first tap/interaction unblocks the audio context,
 * so sounds will work after the user's first touch.
 *
 * Native: works immediately, no restrictions.
 *
 * Usage:
 *   import { sounds } from '@/src/lib/sounds';
 *   sounds.play('correct');
 *   sounds.play('tap');
 */
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

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

// Map sound names to their asset require() calls.
// require() must be called statically (not dynamically) so metro
// can resolve the assets at bundle time.
const SOUND_FILES: Record<SoundName, ReturnType<typeof require>> = {
  tap: require('@/assets/sounds/tap.mp3'),
  correct: require('@/assets/sounds/correct.mp3'),
  wrong: require('@/assets/sounds/wrong.mp3'),
  starPop: require('@/assets/sounds/star-pop.mp3'),
  gemClink: require('@/assets/sounds/gem-clink.mp3'),
  levelComplete: require('@/assets/sounds/level-complete.mp3'),
  levelFail: require('@/assets/sounds/level-fail.mp3'),
  timerTick: require('@/assets/sounds/timer-tick.mp3'),
  timerWarning: require('@/assets/sounds/timer-warning.mp3'),
  celebration: require('@/assets/sounds/celebration.mp3'),
  whoosh: require('@/assets/sounds/whoosh.mp3'),
  powerUp: require('@/assets/sounds/power-up.mp3'),
};

class SoundManager {
  private loaded: Partial<Record<SoundName, Audio.Sound>> = {};
  private enabled = true;
  private initialised = false;

  /** Call once on app start. Preloads all sounds into memory so
   *  play() calls are instant with no loading delay. */
  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;

    try {
      // Set audio mode: mix with other apps, don't interrupt music
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {}

    // Preload all sounds in parallel
    const entries = Object.entries(SOUND_FILES) as [SoundName, ReturnType<typeof require>][];
    await Promise.all(
      entries.map(async ([name, asset]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(asset, { volume: 0.6 });
          this.loaded[name] = sound;
        } catch {
          // Individual sound fail shouldn't block others
        }
      }),
    );
  }

  /** Play a sound by name. Fire-and-forget — never blocks. */
  play(name: SoundName): void {
    if (!this.enabled) return;
    const sound = this.loaded[name];
    if (!sound) return;

    // Reset to start then play. If the sound is already playing
    // (e.g. rapid taps), rewind first so it re-triggers cleanly.
    sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => {});
  }

  /** Enable/disable all sounds (respects the user's settings toggle). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Clean up all loaded sounds on app teardown. */
  async unload(): Promise<void> {
    const entries = Object.values(this.loaded);
    await Promise.all(entries.map((s) => s?.unloadAsync().catch(() => {})));
    this.loaded = {};
    this.initialised = false;
  }
}

/** Singleton instance — import this everywhere. */
export const sounds = new SoundManager();
export type { SoundName };
