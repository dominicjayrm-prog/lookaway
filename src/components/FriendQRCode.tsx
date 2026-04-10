/**
 * FriendQRCode — renders a QR code that encodes a Blanked friend invite
 * URL with the player's equipped Blink mascot centred on top of the code.
 *
 * The QR is generated at error-correction level H (~30% recoverable), so
 * obscuring the middle ~22% with a mascot + backing plate is well within
 * the scanner's tolerance.
 *
 * Pure presentational component — takes the data it needs as props and
 * renders the visual. Parent components decide whether to show it inside
 * a modal, inside a card, etc.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Blink } from '@/src/components/Blink';
import type { BlinkExpression } from '@/src/components/Blink';

interface Props {
  /** The user's own profile.id — the URL will be `/invite/<userId>`. */
  userId: string;
  /** Which Blink face to drop in the centre (defaults to normal). */
  expression?: BlinkExpression;
  /** Total QR side length in pixels. Defaults to 260. */
  size?: number;
  /** Dark module colour. Defaults to near-black. */
  color?: string;
  /** Background colour behind the QR modules. Defaults to white. */
  backgroundColor?: string;
  /** Colour of the small plate behind the Blink mascot. Defaults to the
   *  same background colour so the mascot floats on a clean square. */
  mascotPlateColor?: string;
}

export function buildInviteUrl(userId: string): string {
  return `https://blanked.app/invite/${userId}`;
}

export function FriendQRCode({
  userId,
  expression = 'normal',
  size = 260,
  color = '#1A1A18',
  backgroundColor = '#FFFFFF',
  mascotPlateColor,
}: Props) {
  // Mascot occupies ~22% of the QR area, centred. Slightly larger backing
  // plate (26%) sits behind it so the mascot never touches live modules.
  const mascotSize = Math.round(size * 0.22);
  const plateSize = Math.round(size * 0.26);
  const plateColor = mascotPlateColor ?? backgroundColor;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <QRCode
        value={buildInviteUrl(userId)}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        ecl="H"
      />
      <View
        style={[
          styles.centerPlate,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: Math.round(plateSize * 0.22),
            backgroundColor: plateColor,
            left: (size - plateSize) / 2,
            top: (size - plateSize) / 2,
          },
        ]}
        pointerEvents="none"
      >
        <Blink expression={expression} size={mascotSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlate: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
