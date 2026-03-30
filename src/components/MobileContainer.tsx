import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';

interface MobileContainerProps {
  children: React.ReactNode;
}

const MobileContainerComponent: React.FC<MobileContainerProps> = ({ children }) => {
  const { colors } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, { backgroundColor: colors.surface }]}>
        <View style={[styles.webInner, { backgroundColor: colors.bg }]}>{children}</View>
      </View>
    );
  }
  return <View style={[styles.native, { backgroundColor: colors.bg }]}>{children}</View>;
};

const styles = StyleSheet.create({
  webOuter: { flex: 1, alignItems: 'center' },
  webInner: { flex: 1, width: '100%', maxWidth: 430 },
  native: { flex: 1 },
});

export const MobileContainer = React.memo(MobileContainerComponent);
