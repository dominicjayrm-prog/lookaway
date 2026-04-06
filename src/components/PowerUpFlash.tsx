/**
 * Visual flash effects when a power-up is activated.
 * Shows a brief full-screen tint + icon animation.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';

type PowerUpType = 'slowTime' | 'peek' | 'fiftyFifty' | 'skip';

var CONFIGS: Record<PowerUpType, { color: string; icon: string; label: string }> = {
  slowTime: { color: '#0984E3', icon: '\u23F1\uFE0F', label: '+3s' },
  peek: { color: '#6C5CE7', icon: '\uD83D\uDC41', label: 'Peek!' },
  fiftyFifty: { color: '#00B894', icon: '\u2702\uFE0F', label: '50/50' },
  skip: { color: '#D4A012', icon: '\u23ED\uFE0F', label: 'Skip!' },
};

interface Props {
  type: PowerUpType | null;
  onDone: () => void;
}

function PowerUpFlash({ type, onDone }: Props) {
  var tintOpacity = useRef(new RNAnimated.Value(0)).current;
  var iconScale = useRef(new RNAnimated.Value(0)).current;
  var iconOpacity = useRef(new RNAnimated.Value(0)).current;
  var labelOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!type) return;

    var config = CONFIGS[type];
    if (!config) { onDone(); return; }

    // Screen tint flash
    RNAnimated.sequence([
      RNAnimated.timing(tintOpacity, { toValue: 0.2, duration: 150, useNativeDriver: false }),
      RNAnimated.timing(tintOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();

    // Icon pops in
    RNAnimated.sequence([
      RNAnimated.parallel([
        RNAnimated.spring(iconScale, { toValue: 1, friction: 3, tension: 250, useNativeDriver: false }),
        RNAnimated.timing(iconOpacity, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]),
      RNAnimated.delay(400),
      RNAnimated.parallel([
        RNAnimated.timing(iconScale, { toValue: 1.5, duration: 300, useNativeDriver: false }),
        RNAnimated.timing(iconOpacity, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
    ]).start(() => {
      // Reset for next use
      iconScale.setValue(0);
      iconOpacity.setValue(0);
      labelOpacity.setValue(0);
      onDone();
    });

    // Label fades in
    RNAnimated.sequence([
      RNAnimated.delay(100),
      RNAnimated.timing(labelOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      RNAnimated.delay(300),
      RNAnimated.timing(labelOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [type]);

  if (!type) return null;
  var config = CONFIGS[type];
  if (!config) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Screen edge tint */}
      <RNAnimated.View style={[StyleSheet.absoluteFill, {
        backgroundColor: config.color,
        opacity: tintOpacity,
      }]} />

      {/* Center icon + label */}
      <View style={st.center}>
        <RNAnimated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
          <Text style={st.icon}>{config.icon}</Text>
        </RNAnimated.View>
        <RNAnimated.View style={{ opacity: labelOpacity, marginTop: 8 }}>
          <View style={[st.labelPill, { backgroundColor: config.color }]}>
            <Text style={st.labelText}>{config.label}</Text>
          </View>
        </RNAnimated.View>
      </View>
    </View>
  );
}

export default PowerUpFlash;

var st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 48 },
  labelPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  labelText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
});
