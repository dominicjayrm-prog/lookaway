/**
 * AvatarFrame — Renders a decorative border around the avatar (Blink or photo).
 * Supports solid borders, glow effects, and animated frames.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated as RNAnimated } from 'react-native';
import type { FrameCosmetic } from '@/src/data/cosmetics';

interface AvatarFrameProps {
  frame: FrameCosmetic | null;
  size: number; // avatar size (frame will be slightly larger)
  children: React.ReactNode;
}

function AvatarFrameComponent({ frame, size, children }: AvatarFrameProps) {
  const glowOpacity = useRef(new RNAnimated.Value(0.4)).current;

  // Animated glow pulse for premium frames
  useEffect(() => {
    if (!frame?.animated) return;
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowOpacity, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(glowOpacity, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [frame?.animated, glowOpacity]);

  if (!frame || frame.id === 'frame_none' || frame.borderWidth === 0) {
    return <View style={{ width: size, height: size }}>{children}</View>;
  }

  const frameSize = size + frame.borderWidth * 2 + 4;
  const borderRadius = frameSize / 2;

  return (
    <View style={{ width: frameSize, height: frameSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow layer (behind border) */}
      {frame.glowColor && (
        <RNAnimated.View
          style={[
            styles.glow,
            {
              width: frameSize + 8,
              height: frameSize + 8,
              borderRadius: (frameSize + 8) / 2,
              backgroundColor: frame.glowColor,
              opacity: frame.animated ? glowOpacity : 0.2,
            },
          ]}
        />
      )}
      {/* Border ring */}
      <View
        style={[
          styles.border,
          {
            width: frameSize,
            height: frameSize,
            borderRadius,
            borderWidth: frame.borderWidth,
            borderColor: frame.borderColor,
          },
        ]}
      >
        {/* Avatar content */}
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          {children}
        </View>
      </View>
    </View>
  );
}

export const AvatarFrame = React.memo(AvatarFrameComponent);

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  border: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
