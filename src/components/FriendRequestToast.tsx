/**
 * FriendRequestToast — small slide-from-top toast used after a friend
 * request is sent, received, or when some friend-action completes.
 *
 * Deliberately narrow-purpose: shows an icon, a title, an optional
 * subtitle, and auto-dismisses after ~2.5 seconds. Also accepts a tone
 * ('success' | 'info' | 'error') that controls the stripe + icon colour.
 */
import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated as RNAnimated, Pressable, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';

export type ToastTone = 'success' | 'info' | 'error';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  tone?: ToastTone;
  /** Auto-dismiss after this many ms. Defaults to 2500. */
  duration?: number;
  onDismiss: () => void;
}

export function FriendRequestToast({ visible, title, subtitle, tone = 'success', duration = 2500, onDismiss }: Props) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new RNAnimated.Value(-120)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.spring(translateY, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(translateY, { toValue: -120, duration: 260, useNativeDriver: true }),
          RNAnimated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, duration);
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, onDismiss, translateY, opacity]);

  if (!visible) return null;

  const toneColor =
    tone === 'success' ? colors.correct :
    tone === 'error' ? colors.wrong :
    colors.accent;
  const iconName =
    tone === 'success' ? 'checkmark-circle' :
    tone === 'error' ? 'close-circle' :
    'information-circle';

  return (
    <RNAnimated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0.35 : 0.12,
          },
        ]}
      >
        <View style={[styles.stripe, { backgroundColor: toneColor }]} />
        <View style={styles.content}>
          <Ionicons name={iconName} size={22} color={toneColor} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textMid }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 1 },
});
