import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  unifiedPosition: number;
  onDismiss: () => void;
}

/** Dismissible banner shown ONCE to existing users after the unified
 *  journey rolls out. Slides in from the top with a springy entrance
 *  and has a subtle sparkle pulse so the user notices it but isn't
 *  blocked by it. */
export function MigrationBanner({ unifiedPosition, onDismiss }: Props) {
  const { colors } = useTheme();
  const y = useSharedValue(-30);
  const opacity = useSharedValue(0);
  const sparkleScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    y.value = withSpring(0, { damping: 14, stiffness: 180 });
    sparkleScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [y, opacity, sparkleScale]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
  }));

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onDismiss();
  };

  return (
    <Animated.View style={[st.wrap, enterStyle]}>
      <LinearGradient
        colors={[colors.accentSoft, 'rgba(108, 92, 231, 0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.banner, { borderColor: colors.accent + '33' }]}
      >
        <Animated.View style={sparkleStyle}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
        </Animated.View>
        <View style={st.body}>
          <Text style={[st.title, { color: colors.text }]}>
            {t('journey.migration_title')}
          </Text>
          <Text style={[st.sub, { color: colors.textMid }]}>
            {t('journey.migration_sub', { position: unifiedPosition })}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('journey.migration_dismiss_aria')}
          style={({ pressed }) => [
            st.closeBtn,
            { backgroundColor: pressed ? colors.borderStrong : 'transparent' },
          ]}
        >
          <Ionicons name="close" size={18} color={colors.textMid} />
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
