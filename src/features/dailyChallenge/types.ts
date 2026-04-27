/**
 * Public types for the Daily Challenge feature.
 *
 * Phase 1 ships with a single mode (Phone Number); the rotation /
 * service / share-card layers are written against this protocol so
 * Phases 3-5 (What Changed, Names & Faces, The Witness) can drop in
 * without infrastructure rework.
 */

/** Discriminator for which mode runs on a given day. Future modes
 *  add cases here; the rotation table maps day-of-week to one of
 *  these values. */
export type DailyChallengeModeId =
  | 'phone_number'
  // Phase 3+ (NOT implemented in this build, listed for the
  // rotation table type-checker to accept future config diffs):
  | 'what_changed'
  | 'names_and_faces'
  | 'the_witness';

/** Currently-shipping modes. Narrower union used wherever we need
 *  exhaustive switching to compile only against built modes. */
export type ShippingModeId = 'phone_number';

/** Result of a single completed challenge attempt. Shared shape
 *  across every mode so persistence + share card + result screen
 *  stay mode-agnostic. */
export interface DailyChallengeResult {
  /** The mode that produced this result. */
  mode: DailyChallengeModeId;
  /** Normalised 0-100 score. Each mode projects its own raw scoring
   *  into this range. */
  score: number;
  /** Wall-clock seconds from the end of the memorise phase to the
   *  player's submission. Used for tiebreakers + trend analysis. */
  timeSeconds: number;
  /** Mode-defined emoji block visualisation for the share card.
   *  Phone Number uses one block per digit (purple correct / black
   *  wrong). Future modes may use grids, faces, etc. */
  shareCardEmojiBlocks: string;
  /** UTC YYYY-MM-DD of the challenge this result belongs to. */
  challengeDate: string;
}

/** Generic "what to render during the reveal animation" data. Modes
 *  fill this once their config is built so the shared
 *  ChallengeRevealView can stay dumb. */
export interface ChallengeRevealConfig {
  /** Big title shown character-by-character. Usually the mode's
   *  display name ("Phone Number", "What Changed", etc.). */
  title: string;
  /** Short single-line tagline shown under the title. */
  subtitle: string;
  /** Blink expression that fades in alongside the title. */
  blinkExpression:
    | 'normal' | 'memorise' | 'thinking' | 'celebrate' | 'love'
    | 'detective' | 'sharp_eye' | 'lightning_mind';
}

/** A constructed challenge instance for a specific date + mode.
 *  Built deterministically from the date seed. The container view
 *  hands this to the mode-specific gameplay component. */
export interface DailyChallengeInstance<TConfig = unknown> {
  mode: DailyChallengeModeId;
  challengeDate: string;
  /** Mode-specific config (e.g. Phone Number's digit array). The
   *  generic param keeps callers type-safe when they know which
   *  mode they're dealing with. */
  config: TConfig;
  reveal: ChallengeRevealConfig;
}
