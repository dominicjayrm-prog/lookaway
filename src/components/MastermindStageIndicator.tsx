/**
 * Small gold pill shown during the Mastermind memorise phase
 * indicating which stage is currently being displayed.
 *
 * STAGE 1 OF 3
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  current: number;
  total: number;
}

export function MastermindStageIndicator({ current, total }: Props) {
  return (
    <View style={st.pill}>
      <Text style={st.text}>STAGE {current} OF {total}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(212,160,18,0.15)',
    marginBottom: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D4A012',
    letterSpacing: 1.5,
  },
});
