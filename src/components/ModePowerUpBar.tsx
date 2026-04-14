/**
 * ModePowerUpBar — power-up bar for the 5 exclusive challenge modes.
 *
 * Each mode has its own power-up set defined in `src/data/powerUps.ts`.
 * This bar filters the player's owned power-ups by mode and renders a
 * tappable row with the same visual language as the classic PowerUpBar.
 *
 * Responsibilities:
 *  - Show only power-ups that belong to the current mode
 *  - Display count badge + name
 *  - Disable + show checkmark when already used this round
 *  - Call `onUse(id)` when a tappable button is pressed, OR trigger
 *    the buy popup flow via `onBuyOut(id)` if count is zero
 *
 * The parent screen decides what each power-up actually DOES — this
 * component only surfaces the UI and emits the intent.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ALL_POWERUPS } from '@/src/data/powerUps';
import { spacing } from '@/src/theme/spacing';

function BoltIcon({ size = 18, color = '#6C5CE7' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} /></Svg>;
}

interface Props {
  /** Current mode id — speed_recall, snap_match, sequence, counting_blitz, colour_chain. */
  mode: string;
  /** Map of power-up id → true if already used this round. */
  used: Record<string, boolean>;
  /** Called when the player taps an available power-up. */
  onUse: (id: string) => void;
  /** Called when the player taps a zero-count power-up — parent typically opens the buy popup. */
  onBuyOut?: (id: string) => void;
  /** Hide the bar entirely (e.g. during round_done / feedback states). */
  disabled?: boolean;
}

export function ModePowerUpBar({ mode, used, onUse, onBuyOut, disabled }: Props) {
  const { colors } = useTheme();
  const powerUps = useGameStore((s) => s.powerUps) ?? {};

  // Filter to this mode's power-ups (exclude universal 'all' entries
  // like extra_life — those are handled via lives, not the bar).
  const modePowerUps = ALL_POWERUPS.filter(p => p.modes.includes(mode) && !p.modes.includes('all'));

  if (disabled || modePowerUps.length === 0) return null;

  const anyOwned = modePowerUps.some(p => (powerUps[p.id] ?? 0) > 0 || used[p.id]);

  // Empty state: player doesn't own anything for this mode.
  if (!anyOwned) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '25' }]}>
        <BoltIcon size={18} color={colors.accent} />
        <Text style={[styles.emptyTitle, { color: colors.accent }]}>Power-ups</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>Boost this mode in the shop</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {modePowerUps.map((def) => {
        const count = powerUps[def.id] ?? 0;
        const isUsed = !!used[def.id];
        const available = count > 0 && !isUsed;

        return (
          <Pressable
            key={def.id}
            style={[
              styles.button,
              { backgroundColor: isUsed ? colors.surface : def.bgColor, borderColor: isUsed ? colors.border : def.color + '25' },
            ]}
            onPress={() => {
              if (isUsed) return;
              if (available) onUse(def.id);
              else if (onBuyOut) onBuyOut(def.id);
            }}
            disabled={isUsed}
            accessibilityRole="button"
            accessibilityLabel={`${def.name} power-up`}
            accessibilityState={{ disabled: isUsed }}
          >
            {isUsed ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.textLight} />
            ) : (
              <Ionicons name={iconFor(def.icon) as keyof typeof Ionicons.glyphMap} size={22} color={available ? def.color : colors.textLight} />
            )}
            <Text style={[styles.count, { color: isUsed ? colors.textLight : available ? def.color : colors.textLight }]}>
              {isUsed ? '\u2713' : `x${count}`}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: isUsed ? colors.textLight : available ? def.color + 'B3' : colors.textLight }]}
            >
              {def.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Map power-up icon tokens to real Ionicons names. The powerUps.ts
 *  file uses a mix of tokens like "timer", "snowflake", "ghost" that
 *  aren't all valid Ionicons; we translate them here so every entry
 *  renders something sensible. */
function iconFor(token: string): string {
  switch (token) {
    case 'timer': return 'timer';
    case 'eye': return 'eye';
    case 'scissors': return 'cut';
    case 'fast-forward': return 'play-forward';
    case 'ghost': return 'skull-outline';
    case 'refresh': return 'refresh';
    case 'sparkle': return 'sparkles';
    case 'snowflake': return 'snow';
    case 'replay': return 'play-back';
    case 'shield': return 'shield';
    case 'slow': return 'hourglass';
    case 'filter': return 'color-palette';
    case 'pin': return 'pin';
    case 'heart-shield': return 'heart';
    default: return 'flash';
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: spacing.sm, paddingHorizontal: 4 },
  button: { flex: 1, maxWidth: 90, height: 70, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
  count: { fontSize: 11, fontWeight: '700' },
  label: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  emptyContainer: { alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', gap: 2, marginHorizontal: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptySubtitle: { fontSize: 12 },
});
