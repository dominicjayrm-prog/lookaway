import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface MobileContainerProps {
  children: React.ReactNode;
}

const MobileContainerComponent: React.FC<MobileContainerProps> = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webInner}>{children}</View>
      </View>
    );
  }
  return <View style={styles.native}>{children}</View>;
};

const styles = StyleSheet.create({
  webOuter: { flex: 1, backgroundColor: '#E8E6E1', alignItems: 'center' },
  webInner: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: '#F7F6F3' },
  native: { flex: 1, backgroundColor: '#F7F6F3' },
});

export const MobileContainer = React.memo(MobileContainerComponent);
