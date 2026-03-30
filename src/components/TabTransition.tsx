import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Wraps tab screen content with a fade + subtle slide-up animation
 * that plays every time the tab becomes focused.
 */
export function TabTransition({ children, style }: Props) {
  const isFocused = useIsFocused();
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(10)).current;

  useEffect(() => {
    if (isFocused) {
      opacity.setValue(0);
      translateY.setValue(10);
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [isFocused, opacity, translateY]);

  return (
    <RNAnimated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>
      {children}
    </RNAnimated.View>
  );
}
