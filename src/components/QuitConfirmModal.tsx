/**
 * QuitConfirmModal — single source of truth for the "leave level?"
 * dialog used across every game mode.
 *
 * Why this component exists:
 * Every gameplay screen (campaign, speed, spot, side-campaign,
 * challenge, challenge-mode) needs to confirm before the player
 * abandons a level. Previously each screen had its own copy — some
 * used Alert.alert (iOS system dialog), some used a styled Modal,
 * and the premium-aware "Are you sure you want to leave?" treatment
 * was only wired into campaign levels. Premium subscribers hit the
 * "-1 life" dialog on every other mode even though their lives are
 * never actually deducted.
 *
 * This component standardises the UX:
 *  - Premium users ALWAYS see the polite "Are you sure?" copy with a
 *    plain "Leave" button on every mode.
 *  - Non-premium users see the appropriate warning:
 *      - life-losing modes ("You'll lose a life…" with "Leave (-1 life)")
 *      - non-life modes ("Your progress will be lost…" with "Leave")
 *  - The modal itself matches the campaign design exactly so players
 *    can't tell which screen they're on from the dialog alone.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';

interface Props {
  visible: boolean;
  /** When true, a non-premium Leave button deducts a life. When false,
   *  quitting just abandons progress (e.g. friend-challenge abandon). */
  costsLife: boolean;
  /** Optional override text for the body. Only used when NOT premium
   *  AND NOT costsLife (to explain what happens when they leave, e.g.
   *  "Your friend won't get the challenge."). */
  nonPremiumBody?: string;
  onLeave: () => void;
  onKeepPlaying: () => void;
}

export function QuitConfirmModal({ visible, costsLife, nonPremiumBody, onLeave, onKeepPlaying }: Props) {
  const { colors } = useTheme();
  const isSubscribed = useGameStore((s) => s.isSubscribed());

  const body = isSubscribed
    ? 'Are you sure you want to leave?'
    : costsLife
      ? "You'll lose a life if you quit now."
      : (nonPremiumBody ?? 'Your progress will be lost.');

  const leaveLabel = isSubscribed || !costsLife ? 'Leave' : 'Leave (-1 life)';

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeepPlaying}>
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTouch}
          onPress={onKeepPlaying}
          accessibilityRole="button"
          accessibilityLabel="Dismiss quit dialog"
        />
        <View style={[s.card, { backgroundColor: colors.bg }]}>
          <Text style={[s.title, { color: colors.text }]}>Leave level?</Text>
          <Text style={[s.body, { color: colors.textMid }]}>{body}</Text>
          <Pressable
            style={[s.btn, { backgroundColor: colors.wrong }]}
            onPress={onLeave}
            accessibilityRole="button"
            accessibilityLabel={isSubscribed ? 'Leave the level' : (costsLife ? 'Leave the level and lose a life' : 'Leave the level')}
          >
            <Text style={s.btnText}>{leaveLabel}</Text>
          </Pressable>
          <Pressable
            style={[s.btn, { backgroundColor: colors.accent }]}
            onPress={onKeepPlaying}
            accessibilityRole="button"
            accessibilityLabel="Keep playing"
          >
            <Text style={s.btnText}>Keep playing</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  card: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  btn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', width: '100%' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
