import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WordmarkProps {
  size?: number;
}

const WordmarkComponent: React.FC<WordmarkProps> = ({ size = 24 }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.look, { fontSize: size }]}>Look</Text>
      <Text style={[styles.away, { fontSize: size }]}>Away</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  look: { color: '#1A1A18', fontWeight: '800' },
  away: { color: '#6C5CE7', fontWeight: '800' },
});

export const Wordmark = React.memo(WordmarkComponent);
