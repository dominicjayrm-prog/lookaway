/**
 * FriendAvatar — the friend-facing version of the player's own avatar.
 * Renders (in priority order):
 *   1. The friend's uploaded photo (if avatar_url is set), inside their
 *      equipped frame
 *   2. Their Blink mascot wearing their equipped expression, inside their
 *      equipped frame
 *   3. A fallback initials pill if the friend has no username yet
 *
 * Used in the friends tab list rows (search results, pending requests,
 * active challenges, friends list, recent results) and inside the
 * FriendProfilePopup.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Blink, type BlinkExpression } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById, getExpressionById } from '@/src/data/cosmetics';

interface Props {
  /** The friend's profile row — only the fields we actually need here. */
  username?: string;
  avatarColor: string;
  avatarUrl?: string | null;
  equippedFrame?: string | null;
  equippedExpression?: string | null;
  /** Base Blink size. The frame will render slightly larger to wrap it. */
  size?: number;
  /** When true, show a coloured ring fallback even if the friend has no
   *  frame cosmetic equipped. Useful for compact list rows where a naked
   *  Blink can look stranded. */
  showDefaultRing?: boolean;
}

export function FriendAvatar({
  username,
  avatarColor,
  avatarUrl,
  equippedFrame,
  equippedExpression,
  size = 40,
  showDefaultRing = true,
}: Props) {
  // Resolve cosmetics (undefined returns null which AvatarFrame handles).
  const frame = equippedFrame ? getFrameById(equippedFrame) ?? null : null;
  const expressionCosmetic = equippedExpression ? getExpressionById(equippedExpression) : undefined;
  const blinkExpression: BlinkExpression = expressionCosmetic?.blinkExpression ?? 'normal';

  // Friend has an uploaded photo — render it inside the frame.
  if (avatarUrl) {
    return (
      <AvatarFrame frame={frame} size={size}>
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </AvatarFrame>
    );
  }

  // Friend has a username — render their Blink mascot with the equipped
  // expression, inside the equipped frame. If no frame is equipped and
  // the caller wants a default ring, draw a coloured ring in the friend's
  // avatar colour so it still reads as theirs at a glance.
  if (username) {
    const content = (
      <View
        style={
          !frame && showDefaultRing
            ? {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: avatarColor + '15',
                borderWidth: 2,
                borderColor: avatarColor,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }
            : styles.plainContainer
        }
      >
        <Blink expression={blinkExpression} size={Math.round(size * 0.92)} />
      </View>
    );
    return (
      <AvatarFrame frame={frame} size={size}>
        {content}
      </AvatarFrame>
    );
  }

  // Fallback — no username, no photo. Draw initials in the friend's
  // avatar colour so the row still renders something meaningful.
  const initial = (username ?? '?').charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: avatarColor + '15',
        borderWidth: 2,
        borderColor: avatarColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.45, fontWeight: '800', color: avatarColor }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
