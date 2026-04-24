import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  modeName: string;
  modeColor: string;
  compact?: boolean;
}

/** Badge rendered above the first level of a new mode chapter, e.g.
 *  a small pill showing "Speed Recall" right before the node the player
 *  transitions into that mode. Anchors the player visually so a mode
 *  switch never feels abrupt. */
export function ChapterBadge({ modeName, modeColor, compact }: Props) {
  return (
    <View
      style={[
        st.container,
        { backgroundColor: '#FFFFFF', borderColor: modeColor },
        compact && st.compact,
      ]}
    >
      <View style={[st.dot, { backgroundColor: modeColor }]} />
      <Text style={[st.text, { color: modeColor }]} numberOfLines={1}>
        {modeName}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
