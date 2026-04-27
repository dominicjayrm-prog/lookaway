/**
 * Curated catalogue of visually-distinct Blink "characters" for the
 * Names & Faces daily challenge mode.
 *
 * The Blink component ships ~33 expressions (see src/components/Blink.tsx),
 * but only ~22 of them are GENUINELY distinct at puzzle scale (small
 * render, brief view). The "subtle" expressions (`normal`, `sleeping`,
 * `sad`, `thinking`, `wrong`, `correct`) all just differ in eye / mouth
 * shape against the same purple body — at thumbnail size with brief
 * view, they read as the same character. We exclude those here so a
 * single puzzle never asks the player to distinguish "thinking-Blink"
 * from "sad-Blink".
 *
 * Frames (the coloured rings around each Blink) layer on as the
 * SECONDARY differentiator — same purple expression with different
 * frame colours = visibly different friends.
 *
 * Distinct-character budget: ~22 expressions × ~10 distinct frame
 * colours = ~220 viable combinations. Plenty for any single-day
 * puzzle (max 6 characters per the Phase 4 design).
 */
import type { BlinkExpression } from '@/src/components/Blink';

/** Expressions that read as visually distinct at puzzle scale.
 *  Hand-picked from the full Blink expression set after auditing
 *  every face — anything without a prominent accessory or body
 *  recolouring was excluded so the player isn't asked to spot
 *  millimetre eye differences on a 100px portrait. */
export const DISTINCT_EXPRESSIONS: readonly BlinkExpression[] = [
  // Accessory-driven (face additions you can't miss at glance)
  'pirate',          // eyepatch + diagonal strap
  'cool_guy',        // sunglasses with reflective highlights
  'ninja',           // black mask + red headband
  'angel',           // gold halo
  'devil',           // red horns
  'robot',           // antenna + glowing sphere + square eyes
  'wink',            // one eye closed (asymmetry reads instantly)
  'tongue_out',      // open mouth + protruding tongue
  'surprised',       // oversized open mouth + raised eyebrows
  'detective',       // magnifying glass over one eye
  'sharp_eye',       // squint + raised eyebrow
  'lightning_mind',  // yellow lightning bolts radiating
  'motion_master',   // motion trail ellipses + speed lines
  // Body-recoloured (whole-body palette swap, very obvious at glance)
  'frozen',          // ice-blue body + snowflakes
  'rainbow',         // full spectrum body gradient
  'shadow',          // charcoal-black body
  'cherry_blossom',  // pink body + floating petals
  'galaxy',          // deep purple body + scattered stars
  'golden_blink',    // gold body + zigzag crown
  // Distinct facial accessories
  'love',            // heart-pupil eyes + pink blush
  'celebrate',       // confetti streamers + gold stars
  'premium',         // star-shaped pupils + sparkle lines
] as const;

/** Frame ids matched to their visual ring-colour category at glance
 *  distance. Pulled from `src/data/cosmetics.ts` and trimmed to a
 *  short list of unambiguously-distinct ring tones — pairings like
 *  `frame_blink_normal` (purple) and `frame_double_ring` (light
 *  purple) read as the same colour at puzzle scale, so we only
 *  include one purple-family entry. The id is what `AvatarFrame`
 *  looks up; the colourTag is for the same-puzzle uniqueness guard
 *  inside the generator. */
export interface FrameVariant {
  id: string;
  colourTag: 'purple' | 'gold' | 'ocean' | 'mint' | 'coral' | 'pink' | 'orange' | 'yellow' | 'cyan' | 'black';
}

export const DISTINCT_FRAMES: readonly FrameVariant[] = [
  { id: 'frame_blink_normal',     colourTag: 'purple' },
  { id: 'frame_blink_celebrate',  colourTag: 'gold'   },
  { id: 'frame_ocean',            colourTag: 'ocean'  },
  { id: 'frame_mint',             colourTag: 'mint'   },
  { id: 'frame_coral',            colourTag: 'coral'  },
  { id: 'frame_rose',             colourTag: 'pink'   },
  { id: 'frame_sunset',           colourTag: 'orange' },
  { id: 'frame_lightning',        colourTag: 'yellow' },
  { id: 'frame_ocean_cyan',       colourTag: 'cyan'   },
  { id: 'frame_master',           colourTag: 'black'  },
] as const;

/** The biggest puzzle (Saturday hard variant) uses 6 characters,
 *  and we need every Blink in a puzzle to have a distinct
 *  expression AND a distinct frame colour. Both pools satisfy that
 *  cleanly with room to spare:
 *   - DISTINCT_EXPRESSIONS.length >= 6
 *   - DISTINCT_FRAMES.length >= 6
 *  The generator validates this invariant on construction so a
 *  future regression in the pool sizes doesn't silently produce
 *  duplicate-colour puzzles. */
export const MAX_CHARACTERS_PER_PUZZLE = 6;
