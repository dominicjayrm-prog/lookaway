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
 *   - blanked.app footer
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
import type { DailyChallengeModeId } from '../types';
import { MODE_DISPLAY_NAMES } from '../modeRotation';

export const SHARE_CARD_SIZE = 1080;

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

export type ModeVisual =
  | { kind: 'phone_number'; digits: readonly number[]; correctness: readonly boolean[] }
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

      {/* Top: Blanked wordmark + date eyebrow. */}
      <View style={s.topRow}>
        <View style={s.brandRow}>
          <View style={s.brandDot} />
          <Text style={s.brand}>Blanked</Text>
        </View>
        <Text style={s.date}>{formatLongDate(challengeDate)}</Text>
      </View>

      {/* Mode label */}
      <Text style={s.modeLabel}>DAILY CHALLENGE</Text>
      <Text style={s.modeName}>{MODE_DISPLAY_NAMES[mode]}</Text>

      {/* Hero score number, big and proud. */}
      <View style={s.scoreBlock}>
        <Text style={s.scoreNumber}>{score}</Text>
        <Text style={s.scoreOf}>/100</Text>
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

      <Text style={s.footer}>blanked.app</Text>
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
  // Fallback: just render the emoji blocks string for future modes
  // that haven't defined a custom visual yet.
  return <Text style={s.emojiFallback}>{visual.emojiBlocks}</Text>;
}

function formatLongDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  if (!y || !m || !d) return yyyymmdd;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[m - 1]} ${d}, ${y}`;
}

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
    flexDirection: 'row', alignItems: 'flex-end', marginTop: 60, gap: 8,
  },
  scoreNumber: {
    fontSize: 240, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -8, lineHeight: 240,
    fontVariant: ['tabular-nums'],
  },
  scoreOf: {
    fontSize: 56, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    paddingBottom: 28,
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
