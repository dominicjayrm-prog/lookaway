import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';

interface WordmarkProps {
  size?: number;
}

const WordmarkComponent: React.FC<WordmarkProps> = ({ size = 24 }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.look, { fontSize: size, color: colors.accent }]}>Blank</Text>
      <Text style={[styles.away, { fontSize: size, color: colors.accent }]}>ed</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  look: { fontWeight: '800' },
  away: { fontWeight: '800' },
});

export const Wordmark = React.memo(WordmarkComponent);
