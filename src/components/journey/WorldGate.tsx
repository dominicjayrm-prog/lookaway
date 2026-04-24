import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { WORLD_THEMES, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { t } from '@/src/i18n';
import { localizedWorldName } from './worldI18n';

interface Props {
  nextWorld: WorldTheme;
  locked: boolean;
}

function LockSvg({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M17,10V8A5,5 0 0,0 7,8V10H5V21H19V10H17M9,8A3,3 0 0,1 15,8V10H9V8Z"
        fill={color}
      />
    </Svg>
  );
}

/** Banner rendered on the path at each world boundary (positions 75→76,
 *  150→151, 225→226, 300→301). Shows the upcoming world's theme with
 *  a lock if the player hasn't reached it yet. */
export function WorldGate({ nextWorld, locked }: Props) {
  const meta = WORLD_THEMES[nextWorld];
  const visuals = WORLD_VISUALS[nextWorld];
  const colors: [string, string] = locked
    ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.45)']
    : [visuals.gradientColors[0], visuals.gradientColors[1]];
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.gate}>
      <View style={st.content}>
        {locked && <LockSvg size={16} color="rgba(255,255,255,0.85)" />}
        <View style={st.textBlock}>
          <Text style={st.eyebrow}>
            {t('journey.world_gate_ahead', { num: meta.worldNumber })}
          </Text>
          <Text style={st.title}>{localizedWorldName(nextWorld)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  gate: {
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textBlock: {
    alignItems: 'center',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
