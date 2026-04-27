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
