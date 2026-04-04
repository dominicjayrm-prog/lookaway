import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Line, G } from 'react-native-svg';

interface BlankedLogoProps {
  size?: number;
}

const BlankedLogoComponent: React.FC<BlankedLogoProps> = ({ size = 64 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6C5CE7" />
          <Stop offset="1" stopColor="#A29BFE" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={64} height={64} rx={16} fill="url(#bgGradient)" />
      <G transform="translate(14, 20)">
        <Path d="M2 12 Q18 0 34 12 Q18 24 2 12Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth={1.5} />
        <Circle cx={18} cy={12} r={6} fill="white" />
        <Circle cx={18} cy={12} r={3} fill="#6C5CE7" />
        <Line x1={18} y1={1} x2={18} y2={-2} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
        <Line x1={8} y1={4} x2={5} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
        <Line x1={28} y1={4} x2={31} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
};

export const BlankedLogo = React.memo(BlankedLogoComponent);
