/**
 * Beautiful image-based share card for the Daily Challenge.
 *
 * Renders as a 1080x1080 square (Instagram feed / FB / Twitter all
 * crop fine; Stories crops top+bottom but the centre block stays
 * legible). Captured to PNG via react-native-view-shot then handed
 * to the OS share sheet via expo-sharing.
 *
 * Visual brief from the user: "MAKE IT BEAUTIFUL... not some emoji
 * shit." So the card uses:
 *   - Layered purple gradient background with subtle radial glow
 *   - Blanked wordmark + Blink mascot on top
 *   - Massive score number with gradient treatment
 *   - Mode-specific visual block (Phone Number: digit pills with
 *     correct/wrong colouring instead of emoji squares)
 *   - Time + streak chips
 *   - playblanked.com footer
 *   - Blink mascot whose expression scales with the player's
 *     score (wink for strong, thinking for mid, sad for weak)
 *
 * The card is rendered off-screen (positioned absolute, opacity 0.001
 * to avoid the "flashes onto screen" effect during capture) so the
 * player only sees the share sheet, not the card itself. Scaled at
 * fixed 1080px logical size so all platforms produce consistent PNG
 * dimensions regardless of device pixel density.
 */
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Blink, type BlinkExpression } from '@/src/components/Blink';
import { t } from '@/src/i18n';
import type { DailyChallengeModeId } from '../types';
import { getModeDisplayName } from '../modeRotation';
import { formatLongDate } from '../formatDate';

export const SHARE_CARD_SIZE = 1080;

/** Pick the Blink expression rendered on the share card based on
 *  how the player did. Per the user's brief: a winky / happy Blink
 *  for strong scores, a soft sad Blink for weak ones, with a
 *  neutral middle so a 50-79 doesn't feel either celebratory or
 *  punishing. The Blink SVGs scale cleanly because the share card
 *  is captured at native 1080px resolution. */
function blinkForScore(score: number): BlinkExpression {
  if (score >= 80) return 'wink';
  if (score >= 50) return 'thinking';
  return 'sad';
}

interface Props {
  mode: DailyChallengeModeId;
  challengeDate: string;
  score: number;
  timeSeconds: number;
  streakCount: number;
  /** Mode-specific visual data. Phone Number passes
   *  `{ kind: 'phone_number', digits, correctness }` so the card
   *  can render coloured digit pills instead of generic emojis. */
  modeVisual: ModeVisual;
}

import type { WhatChangedConfig } from '../modes/whatChanged/logic';
import type { NamesAndFacesConfig } from '../modes/namesAndFaces/logic';
import type { WitnessConfig } from '../modes/witness/logic';
import { activeWitnessLocale } from '../modes/witness/logic';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
export type ModeVisual =
  | { kind: 'phone_number'; digits: readonly number[]; correctness: readonly boolean[] }
  | {
      kind: 'what_changed';
      /** Full puzzle config so we can render the modified grid in
       *  miniature on the share card. */
      config: WhatChangedConfig;
      /** Cells the player tapped that DID change (correct). */
      correctIndexes: readonly number[];
      /** Cells the player tapped that didn't change (wrong). */
      incorrectIndexes: readonly number[];
      /** Cells that changed but the player missed. */
      missedIndexes: readonly number[];
    }
  | {
      kind: 'names_and_faces';
      /** Full puzzle config — characters in memorise order, used so
       *  the share card renders the SAME Blinks the player saw with
       *  their assigned frame rings + names underneath. */
      config: NamesAndFacesConfig;
      /** Per-character (memorise order) correctness — true if the
       *  player paired the correct name to that face. */
      correctness: readonly boolean[];
      /** Per-character (memorise order) name the player paired. May
       *  be undefined if they somehow submitted with a missing pair
       *  (shouldn't happen — submit gates on allPaired). */
      pairedNameByCharIdx: readonly (string | undefined)[];
    }
  | {
      kind: 'the_witness';
      /** Full puzzle config so the share card can render a small
       *  story-snippet preview (the first sentence of the scene) plus
       *  per-question correctness chips. */
      config: WitnessConfig;
      /** Per-question correctness in display order. */
      correctness: readonly boolean[];
    }
  | {
      kind: 'mental_maths';
      /** Per-round outcome: the true total, what the player entered,
       *  and the accuracy tier. Rendered as three "sum chips". */
      outcomes: readonly { target: number; entered: number; tier: 'exact' | 'close' | 'near' | 'miss' }[];
    }
  | { kind: 'fallback'; emojiBlocks: string };

/** forwardRef so callers can captureRef(this, ...) via view-shot. */
export const ShareCardImage = forwardRef<View, Props>(function ShareCardImage(
  { mode, challengeDate, score, timeSeconds, streakCount, modeVisual },
  ref,
) {
  return (
    <View ref={ref} style={s.card} collapsable={false}>
      {/* Layered backgrounds: deep purple gradient + soft blob glow.
          The blob comes from an SVG with a radial-feeling gradient
          since RN doesn't have native radial gradients on web. */}
      <LinearGradient
        colors={['#3D2F9E', '#6C5CE7', '#A29BFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={SHARE_CARD_SIZE} height={SHARE_CARD_SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={SHARE_CARD_SIZE * 0.78} cy={SHARE_CARD_SIZE * 0.18} r={300} fill="url(#glow)" />
        <Circle cx={SHARE_CARD_SIZE * 0.18} cy={SHARE_CARD_SIZE * 0.92} r={260} fill="url(#glow)" />
      </Svg>

      {/* Top: Blanked wordmark + date eyebrow. Brand stays untouched
          across locales (proper noun); date routes through the
          locale-aware Intl formatter. */}
      <View style={s.topRow}>
        <View style={s.brandRow}>
          <View style={s.brandDot} />
          <Text style={s.brand}>Blanked</Text>
        </View>
        <Text style={s.date}>{formatLongDate(challengeDate)}</Text>
      </View>

      {/* Mode label */}
      <Text style={s.modeLabel}>{t('daily_challenge.share_card.subtitle_eyebrow')}</Text>
      <Text style={s.modeName}>{getModeDisplayName(mode)}</Text>

      {/* Hero score number, big and proud — sized to dominate the
          card. Blink sits to the right inside a soft white-ring
          glass frame; expression scales with the player's score
          (wink / thinking / sad) so the mascot reflects how the
          challenge actually went. SVG scales cleanly at the share
          card's 1080px capture resolution. */}
      <View style={s.scoreBlock}>
        <View style={s.scoreNumberWrap}>
          <Text style={s.scoreNumber}>{score}</Text>
          <Text style={s.scoreOf}>/100</Text>
        </View>
        <View style={s.blinkRing}>
          <Blink expression={blinkForScore(score)} size={210} />
        </View>
      </View>

      {/* Mode-specific visual */}
      <View style={s.visualWrap}>
        <ModeVisualBlock visual={modeVisual} />
      </View>

      {/* Bottom: time + streak chips */}
      <View style={s.bottomChips}>
        <View style={s.chip}>
          <Text style={s.chipIcon}>⏱</Text>
          <Text style={s.chipText}>{timeSeconds.toFixed(1)}s</Text>
        </View>
        {streakCount >= 1 && (
          <View style={[s.chip, s.chipFire]}>
            <Text style={s.chipIcon}>🔥</Text>
            <Text style={s.chipText}>{streakCount} day{streakCount === 1 ? '' : 's'}</Text>
          </View>
        )}
      </View>

      <Text style={s.footer}>{t('daily_challenge.share_card.footer')}</Text>
    </View>
  );
});

function ModeVisualBlock({ visual }: { visual: ModeVisual }) {
  if (visual.kind === 'phone_number') {
    return (
      <View style={s.digitsRow}>
        {visual.digits.map((d, i) => {
          const correct = visual.correctness[i];
          return (
            <View
              key={i}
              style={[
                s.digitPill,
                {
                  backgroundColor: correct ? 'rgba(0,184,148,0.92)' : 'rgba(255,107,107,0.92)',
                  borderColor: correct ? '#00B894' : '#FF6B6B',
                },
              ]}
            >
              <Text style={s.digitPillText}>{d}</Text>
            </View>
          );
        })}
      </View>
    );
  }
  if (visual.kind === 'what_changed') {
    // Render a mini grid of the modified puzzle. Cells tapped
    // correctly get a purple-on-emoji halo; tapped wrong cells get
    // a red ring; missed changes get a gold dashed ring. Cells the
    // player didn't touch and didn't change render plain. Reads at
    // a glance + uses shape (ring style) on top of colour for
    // colour-blind safety.
    const correctSet = new Set(visual.correctIndexes);
    const incorrectSet = new Set(visual.incorrectIndexes);
    const missedSet = new Set(visual.missedIndexes);
    const rows = Array.from({ length: visual.config.rows }, (_, r) => r);
    return (
      <View style={s.wcGridWrap}>
        {rows.map((r) => (
          <View key={r} style={s.wcGridRow}>
            {Array.from({ length: visual.config.cols }, (_, c) => {
              const idx = r * visual.config.cols + c;
              const emoji = visual.config.modified[idx];
              let borderColor = 'rgba(255,255,255,0.18)';
              let borderWidth = 2;
              let borderStyle: 'solid' | 'dashed' = 'solid';
              let bg = 'rgba(255,255,255,0.05)';
              if (correctSet.has(idx)) {
                borderColor = '#FFFFFF';
                bg = 'rgba(255,255,255,0.32)';
              } else if (incorrectSet.has(idx)) {
                borderColor = '#FF6B6B';
                bg = 'rgba(255,107,107,0.32)';
              } else if (missedSet.has(idx)) {
                borderColor = '#FFD45A';
                borderStyle = 'dashed';
                bg = 'rgba(255,212,90,0.18)';
              }
              return (
                <View
                  key={c}
                  style={[
                    s.wcCell,
                    { borderColor, borderWidth, borderStyle, backgroundColor: bg },
                  ]}
                >
                  {emoji ? <Text style={s.wcCellEmoji}>{emoji}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
  if (visual.kind === 'names_and_faces') {
    // Render the same Blinks the player saw, in memorise order, each
    // inside its assigned frame ring with the player's paired name
    // underneath. Correct pairings get a green ring + ✓ badge, wrong
    // ones get a coral ring + ✕ + the actual correct name in muted
    // gold (matching the in-app reveal). Mini portraits sit small
    // enough that even the 6-character hard day fits on a single row.
    // Portrait size scales with character count so 6 portraits fit
    // across the share card's content width (~928px after padding)
    // without squeezing — easy day uses larger portraits, hard day
    // shrinks them slightly. The Blink + frame nests inside.
    const wrapSize = visual.config.numCharacters >= 5 ? 130 : 170;
    const blinkSize = wrapSize - 28;
    return (
      <View style={s.nfRow}>
        {visual.config.characters.map((char, i) => {
          const correct = visual.correctness[i];
          const paired = visual.pairedNameByCharIdx[i];
          const expected = char.name;
          const frame = getFrameById(char.frame.id) ?? null;
          const ringColor = correct ? '#00B894' : '#FF6B6B';
          return (
            <View key={i} style={s.nfCell}>
              <View
                style={[
                  s.nfPortraitWrap,
                  {
                    width: wrapSize, height: wrapSize,
                    borderColor: ringColor,
                    backgroundColor: ringColor + '22',
                  },
                ]}
              >
                <AvatarFrame frame={frame} size={blinkSize}>
                  <Blink expression={char.expression} size={blinkSize} />
                </AvatarFrame>
                <View style={[s.nfBadge, { backgroundColor: ringColor }]}>
                  <Text style={s.nfBadgeText}>{correct ? '✓' : '✕'}</Text>
                </View>
              </View>
              <Text style={s.nfNameLabel} numberOfLines={1}>
                {paired ?? '—'}
              </Text>
              {!correct && (
                <Text style={s.nfCorrectName} numberOfLines={1}>
                  {expected}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }
  if (visual.kind === 'the_witness') {
    // Render a "novel-cover" style snippet of the scene's first
    // sentence (the most evocative line) in italic serif, then a
    // row of 4 question chips below. Each chip shows the first ~5
    // words of its question with a ✓/✕ badge keyed to per-question
    // correctness. Reads like a book jacket review at a glance.
    const locale = activeWitnessLocale();
    const sceneText = visual.config.scene[locale];
    // First sentence of the scene = up to the first full stop. If
    // the prose is short enough that no stop is found we fall back
    // to the entire scene (won't happen with v1 templates but keeps
    // the share card from breaking on a future short template).
    const firstSentence = (() => {
      const i = sceneText.indexOf('.');
      return i === -1 ? sceneText : sceneText.slice(0, i + 1);
    })();
    return (
      <View style={s.tWitnessWrap}>
        <View style={s.tWitnessSnippetCard}>
          <Text style={s.tWitnessSnippet} numberOfLines={3}>
            {firstSentence}
          </Text>
        </View>
        <View style={s.tWitnessChipRow}>
          {visual.config.questions.map((q, i) => {
            const correct = visual.correctness[i];
            const ringColor = correct ? '#00B894' : '#FF6B6B';
            // Truncate the question to its leading words so 4 chips
            // fit comfortably across the 1080px card width.
            const text = q.text[locale];
            const trimmed = text.length > 28 ? text.slice(0, 28) + '…' : text;
            return (
              <View
                key={i}
                style={[
                  s.tWitnessChip,
                  {
                    borderColor: ringColor,
                    backgroundColor: ringColor + '22',
                  },
                ]}
              >
                <View style={[s.tWitnessChipBadge, { backgroundColor: ringColor }]}>
                  <Text style={s.tWitnessChipBadgeText}>{correct ? '✓' : '✕'}</Text>
                </View>
                <Text style={s.tWitnessChipText} numberOfLines={2}>
                  {trimmed}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
  if (visual.kind === 'mental_maths') {
    // Three round chips: the target total big, the player's entry
    // underneath when they missed. Tier colour ramps green → gold →
    // orange → coral. Numbers-only — the day's sequence itself stays
    // secret so the share can't spoil the puzzle.
    const tierColor = (tier: 'exact' | 'close' | 'near' | 'miss') =>
      tier === 'exact' ? '#00B894' : tier === 'close' ? '#D4A012' : tier === 'near' ? '#E1701A' : '#FF6B6B';
    return (
      <View style={s.mmRow}>
        {visual.outcomes.map((o, i) => {
          const color = tierColor(o.tier);
          return (
            <View key={i} style={[s.mmChip, { borderColor: color, backgroundColor: color + '22' }]}>
              <Text style={s.mmChipRound}>{`R${i + 1}`}</Text>
              <Text style={s.mmChipTotal}>{`Σ ${o.target}`}</Text>
              <View style={[s.mmBadge, { backgroundColor: color }]}>
                <Text style={s.mmBadgeText}>{o.tier === 'exact' ? '✓' : o.entered}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }
  // Fallback: just render the emoji blocks string for future modes
  // that haven't defined a custom visual yet.
  return <Text style={s.emojiFallback}>{visual.emojiBlocks}</Text>;
}

// formatLongDate moved to ../formatDate.ts so it can be shared
// with ShareCardGenerator (text share) and use Intl for proper
// locale-aware month names.

const s = StyleSheet.create({
  card: {
    width: SHARE_CARD_SIZE, height: SHARE_CARD_SIZE,
    overflow: 'hidden',
    paddingHorizontal: 76, paddingTop: 76, paddingBottom: 64,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOpacity: 0.55, shadowOffset: { width: 0, height: 0 }, shadowRadius: 18,
  },
  brand: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -0.6,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  },
  date: {
    fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.3,
  },
  modeLabel: {
    fontSize: 18, fontWeight: '900', letterSpacing: 4,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 70,
  },
  modeName: {
    fontSize: 56, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -1.2, marginTop: 8,
  },
  scoreBlock: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 60, gap: 8,
  },
  // Wraps the score number + /100 so the row can space-between it
  // against the Blink ring on the right without breaking either
  // child's internal alignment.
  scoreNumberWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  scoreNumber: {
    fontSize: 220, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -8, lineHeight: 220,
    fontVariant: ['tabular-nums'],
  },
  scoreOf: {
    fontSize: 52, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    paddingBottom: 24,
  },
  // Glassy ring around Blink. Soft white outer border + frosted
  // translucent interior + faint outer glow lift the mascot off
  // the gradient background. Bottom-aligned with the score number
  // so the visual weight balances along the card's centre line.
  blinkRing: {
    width: 260, height: 260, borderRadius: 130,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.32)',
    marginBottom: 8,
    shadowColor: '#FFFFFF', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 24,
  },
  visualWrap: { marginTop: 30 },
  digitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  mmRow: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  mmChip: {
    minWidth: 220, borderWidth: 4, borderRadius: 32,
    paddingVertical: 26, paddingHorizontal: 24,
    alignItems: 'center', gap: 8,
  },
  mmChipRound: { fontSize: 26, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 2 },
  mmChipTotal: { fontSize: 58, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  mmBadge: {
    minWidth: 52, height: 52, borderRadius: 26, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  mmBadgeText: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  digitPill: {
    width: 92, height: 110,
    borderRadius: 18, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  digitPillText: {
    fontSize: 56, fontWeight: '900', color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  emojiFallback: { fontSize: 64, color: '#FFFFFF', letterSpacing: 4 },
  // What Changed mini-grid for the share card. Sized to fit
  // alongside the score block at 1080px wide; each cell is ~110px
  // square with 14px gap so a 5x4 grid (the hardest day) lays out
  // at ~580x460 — fits within the share card's width with breathing
  // room. The 3x3 / 4x4 days render smaller naturally.
  wcGridWrap: { gap: 14 },
  wcGridRow: { flexDirection: 'row', gap: 14 },
  wcCell: {
    width: 110, height: 110, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  wcCellEmoji: { fontSize: 56, lineHeight: 70 },
  // Names & Faces share-card row. The portraits sit on coloured
  // tinted backgrounds (green for correct, coral for wrong) with a
  // ✓/✕ badge in the top-right of each portrait + the player's
  // paired name underneath. The actual correct name fades in below
  // wrong answers in muted gold. Sized so 6 characters fit across
  // the 1080px card (visual cap is 6 — the hard-day budget).
  nfRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18 },
  nfCell: { alignItems: 'center', gap: 8 },
  nfPortraitWrap: {
    borderRadius: 999, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  nfBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  nfBadgeText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  nfNameLabel: {
    fontSize: 24, fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: 170, textAlign: 'center',
  },
  nfCorrectName: {
    fontSize: 18, fontWeight: '700',
    color: 'rgba(255, 212, 90, 0.85)',
    maxWidth: 170, textAlign: 'center',
    letterSpacing: 0.3,
  },
  // The Witness share card. A "novel-cover" style snippet of the
  // scene's opening sentence sits in an italic serif card up top,
  // with 4 per-question correctness chips beneath it. Designed to
  // feel like a book-jacket pull quote rather than another emoji
  // grid — fitting for the reading mode.
  tWitnessWrap: { gap: 22 },
  tWitnessSnippetCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 28, paddingVertical: 26,
  },
  tWitnessSnippet: {
    fontSize: 30, lineHeight: 42,
    color: '#FFFFFF', fontWeight: '500',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    letterSpacing: 0.2,
  },
  tWitnessChipRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12,
  },
  tWitnessChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '48%',
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, borderWidth: 2,
  },
  tWitnessChipBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tWitnessChipBadgeText: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '900',
  },
  tWitnessChipText: {
    fontSize: 18, lineHeight: 22, fontWeight: '700',
    color: '#FFFFFF', flex: 1,
  },
  bottomChips: {
    flexDirection: 'row', gap: 14,
    marginTop: 'auto',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1.5,
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 999,
  },
  chipFire: {
    backgroundColor: 'rgba(255,107,107,0.28)',
    borderColor: 'rgba(255,107,107,0.6)',
  },
  chipIcon: { fontSize: 28 },
  chipText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  footer: {
    marginTop: 28, alignSelf: 'flex-start',
    fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
  },
});
